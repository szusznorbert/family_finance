#!/usr/bin/env python3
"""Best-effort Codex lifecycle adapter; engine owns authoritative state."""
import datetime as dt
import json
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"scripts"/"workflow"))
from engine import BASE,WorkflowError,approve,current,start

WORKFLOWS=("epic-planning","task-execution","epic-stabilization")
HEADER=re.compile(r"(?m)^Workflow:\s*(epic-planning|task-execution|epic-stabilization)\s*$\nMode:\s*(auto|plan-only)\s*$\nTask:\s*(EPIC-\d{2}(?:-T\d{2})?)\s*$")

def context(kind,message):
    return {"hookSpecificOutput":{"hookEventName":kind,"additionalContext":message}}

def track(event,run):
    if run is None:return
    row={"at":dt.datetime.now(dt.timezone.utc).isoformat(),"run_id":run["run_id"],
         "step":next((k for k,v in run["steps"].items() if v["status"]=="running"),None),
         "session_id":event.get("session_id"),"agent_id":event.get("agent_id"),
         "agent_type":event.get("agent_type"),"event":event["hook_event_name"]}
    file=BASE/"telemetry"/"agent-events.jsonl"
    file.parent.mkdir(parents=True,exist_ok=True)
    with file.open("a") as f:f.write(json.dumps(row)+"\n")

def handle(event):
    kind=event.get("hook_event_name")
    run=current()
    if kind=="UserPromptSubmit":
        prompt=event.get("prompt","")
        approval=re.fullmatch(r"\s*Approve plan:\s*(run-[0-9a-f]{12})\s*",prompt)
        if approval:
            try:run=approve(approval.group(1))
            except WorkflowError as error:return {"decision":"block","reason":str(error)}
            return context(kind,"Explicit approval recorded for "+run["run_id"]+". Resume recorded step.")
        match=HEADER.search(prompt)
        if match:
            workflow,mode,task=match.groups()
            if workflow=="task-execution" and not re.fullmatch(r"EPIC-\d{2}-T\d{2}",task):
                return {"decision":"block","reason":"Task execution needs EPIC-XX-TYY"}
            if workflow!="task-execution" and not re.fullmatch(r"EPIC-\d{2}",task):
                return {"decision":"block","reason":"Epic workflow needs EPIC-XX"}
            if run is not None and (run["workflow"],run["mode"],run["task"])!=(workflow,mode,task):
                return {"decision":"block","reason":"Different workflow active; finish or resolve it first."}
            if run is None:
                try:run=start(workflow,mode,task,event.get("session_id"))
                except WorkflowError as error:return {"decision":"block","reason":str(error)}
            return context(kind,"Workflow "+run["run_id"]+" ready. Main Agent: use engine begin/complete for deterministic steps.")
        if run is not None:
            return context(kind,"Active "+run["workflow"]+" "+run["task"]+"; consult engine status, resume recorded step. Routine refinements stay in task.")
        return context(kind,"No active run. For implementation requests, Main Agent must start or iterate task-execution and call engine begin/complete. Do not start for status questions.")
    if kind=="SessionStart":
        return context(kind,"Main Agent follows AGENTS.md protocol. "+("Active "+run["run_id"]+" "+run["status"] if run else "No active run; check engine status before an implementation request."))
    if kind in ("SubagentStart","SubagentStop"):
        track(event,run)
        return None
    if kind=="Stop" and run and run["mode"]=="auto" and run["status"]=="running" and not event.get("stop_hook_active"):
        if any(v["status"]=="failed" for v in run["steps"].values()):
            return None
        pending=[name for name,step in run["steps"].items() if step["status"]!="completed"]
        if pending:
            return {"decision":"block","reason":"Recorded workflow is incomplete: "+", ".join(pending)+". Follow AGENTS.md and complete real work or report blocker."}
    return None

if __name__=="__main__":
    try:
        answer=handle(json.load(sys.stdin))
        if answer:print(json.dumps(answer))
    except Exception as error:
        print("Workflow hook error: "+str(error),file=sys.stderr)
        sys.exit(2)
