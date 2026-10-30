#!/usr/bin/env python3
"""Local Codex workflow lifecycle hook. Stores agent metadata, not prompts."""
import datetime as dt
import json
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"scripts"/"workflow"))
from engine import BASE,WorkflowError,approve,current,start

def ctx(kind,msg):
    return {"hookSpecificOutput":{"hookEventName":kind,"additionalContext":msg}}
def deny(msg):
    return {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":msg}}

def track(event,run):
    if not run:return
    row={"at":dt.datetime.now(dt.timezone.utc).isoformat(),"run_id":run["run_id"],
         "step":next((k for k,v in run["steps"].items() if v["status"]=="running"),None),
         "session_id":event.get("session_id"),"agent_id":event.get("agent_id"),
         "agent_type":event.get("agent_type"),"event":event["hook_event_name"]}
    path=BASE/"telemetry"/"agent-events.jsonl"
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("a") as out:out.write(json.dumps(row)+"\n")

def guard(event,run):
    phase=next((k for k,v in run["steps"].items() if v["status"]=="running"),None)
    if phase=="implementation" and run["status"]=="running":return None
    tool=event.get("tool_name")
    cmd=str((event.get("tool_input") or {}).get("command") or "")
    if tool=="apply_patch":
        files=re.findall(r"^\*\*\* (?:Add|Update|Delete) File: (.+)$",cmd,re.M)
        if files:
            permitted=True
            for file in files:
                target=(ROOT/file.strip()).resolve()
                if not target.is_relative_to(ROOT):permitted=False;break
                rel=target.relative_to(ROOT).as_posix()
                if not (rel.startswith(".workflow/") or phase=="planning" and rel.startswith("product-owner/epics/")):
                    permitted=False;break
            if permitted:return None
    if tool=="Bash":
        forbidden=(";","&&","|",">","$(","\n",chr(96))
        if not any(x in cmd for x in forbidden):
            if re.fullmatch(r"(?:python3|python) scripts/workflow/engine\.py (?:start|begin|complete|status|reopen-implementation)\b.*",cmd.strip()):
                return None
            if any(cmd.strip()==x or cmd.startswith(x+" ") for x in ("pwd","ls","rg","grep","cat","head","tail","git status","git diff","git log","git rev-parse","find","pnpm --version","node --version","python3 --version")):
                return None
    return deny("Workflow gate: tools that modify application code are blocked until implementation.")

def handle(event):
    kind=event.get("hook_event_name");run=current()
    if kind=="UserPromptSubmit":
        prompt=event.get("prompt","")
        approval=re.fullmatch(r"\s*Approve plan:\s*(run-[0-9a-f]{12})\s*",prompt)
        if approval:
            try:run=approve(approval.group(1))
            except WorkflowError as exc:return {"decision":"block","reason":str(exc)}
            return ctx(kind,"Approved "+run["run_id"]+". Continue from recorded state.")
        m=re.search(r"(?m)^Workflow:\s*(new-feature|bug-fix|refactoring)\s*$\nMode:\s*(auto|plan-only)\s*$\nTask:\s*(EPIC-\d{2}-T\d{2})\s*$",prompt)
        if m:
            workflow,mode,task=m.groups()
            if run and run["status"] not in ("completed","cancelled"):
                if (run["workflow"],run["mode"],run["task"])!=(workflow,mode,task):
                    return {"decision":"block","reason":"A different workflow is active."}
            else:
                try:run=start(workflow,mode,task,event.get("session_id"))
                except WorkflowError as exc:return {"decision":"block","reason":str(exc)}
            return ctx(kind,"Workflow "+run["run_id"]+": call engine begin/complete for each step.")
        return ctx(kind,"Active "+run["run_id"]+"; follow required gates.") if run else None
    if kind=="SessionStart":
        return ctx(kind,"Workflow "+run["run_id"]+" status "+run["status"] if run else "No active workflow.")
    if kind in ("SubagentStart","SubagentStop"):
        track(event,run);return ctx(kind,"Follow workflow role boundaries.") if kind=="SubagentStart" and run else None
    if kind=="PreToolUse" and run:return guard(event,run)
    if kind=="Stop" and run and run["mode"]=="auto" and run["status"]=="running" and not event.get("stop_hook_active"):
        if all(v["status"]!="failed" for v in run["steps"].values()):
            pending=[s for s,v in run["steps"].items() if v["status"]!="completed"]
            if pending:return {"decision":"block","reason":"Workflow still running: "+", ".join(pending)}
    return None

if __name__=="__main__":
    try:
        output=handle(json.load(sys.stdin))
        if output:print(json.dumps(output))
    except Exception as exc:
        print("Workflow hook error: "+str(exc),file=sys.stderr)
        sys.exit(2)
