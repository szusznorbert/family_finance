#!/usr/bin/env python3
"""Local, sequential Codex workflow coordinator. Does not launch agents."""
import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid
import yaml

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/".workflow"
RUNS=BASE/"runs"
ACTIVE=BASE/"active.json"
WF=ROOT/".codex"/"workflows"

class WorkflowError(Exception): pass

def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def write(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+"."+uuid.uuid4().hex+".tmp")
    tmp.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n")
    os.replace(tmp,path)

@contextlib.contextmanager
def lock():
    BASE.mkdir(parents=True,exist_ok=True)
    with (BASE/".lock").open("a+") as fd:
        fcntl.flock(fd,fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(fd,fcntl.LOCK_UN)

def definition(name):
    if not re.fullmatch(r"[a-z][a-z0-9-]{0,50}",name): raise WorkflowError("Invalid workflow name")
    path=WF/(name+".yaml")
    if not path.is_file(): raise WorkflowError("Unknown workflow")
    data=yaml.safe_load(path.read_text())
    if not isinstance(data,dict) or data.get("id")!=name: raise WorkflowError("Invalid workflow definition")
    steps=data.get("steps")
    if not isinstance(steps,list) or not steps: raise WorkflowError("No steps")
    ids=[]
    for entry in steps:
        if not isinstance(entry,dict) or not isinstance(entry.get("id"),str) or entry["id"] in ids:
            raise WorkflowError("Invalid or duplicate step")
        if not isinstance(entry.get("depends_on"),list) or any(d not in ids for d in entry["depends_on"]):
            raise WorkflowError("Dependencies must refer to earlier steps")
        ids.append(entry["id"])
    if ids[0]!="planning" or not {"implementation","verification","review"}.issubset(ids):
        raise WorkflowError("Mandatory steps missing")
    return data

def current():
    if not ACTIVE.exists(): return None
    pointer=json.loads(ACTIVE.read_text())
    return json.loads((RUNS/pointer["run_id"]/"state.json").read_text())

def save(run):
    write(RUNS/run["run_id"]/"state.json",run)

def start(workflow,mode,task,session=None):
    if mode not in ("auto","plan-only"): raise WorkflowError("Invalid mode")
    if not re.fullmatch(r"EPIC-[0-9]{2}-T[0-9]{2}",task):
        raise WorkflowError("Use EPIC-XX-TYY task identifier")
    d=definition(workflow)
    with lock():
        existing=current()
        if existing and existing["status"] not in ("completed","cancelled"):
            raise WorkflowError("Workflow already active: "+existing["run_id"])
        run={"run_id":"run-"+uuid.uuid4().hex[:12],"workflow":workflow,"version":d["version"],
             "task":task,"mode":mode,"session_id":session,"status":"running",
             "approved":False,"created_at":stamp(),
             "steps":{s["id"]:{"status":"pending","started_at":None,"ended_at":None,"evidence":[]} for s in d["steps"]}}
        save(run)
        write(ACTIVE,{"run_id":run["run_id"]})
        return run

def step_spec(run,step):
    d=definition(run["workflow"])
    if run["version"]!=d["version"]: raise WorkflowError("Definition changed during run")
    return next((s for s in d["steps"] if s["id"]==step),None)

def begin(step):
    with lock():
        run=current()
        if not run or run["status"]!="running": raise WorkflowError("No runnable workflow")
        spec=step_spec(run,step)
        if not spec: raise WorkflowError("Unknown step")
        if any(x["status"]=="running" for x in run["steps"].values()):
            raise WorkflowError("Another step is already running")
        if run["steps"][step]["status"] not in ("pending","failed"):
            raise WorkflowError("Step not pending")
        if any(run["steps"][dep]["status"]!="completed" for dep in spec["depends_on"]):
            raise WorkflowError("Dependencies not completed")
        if step!="planning" and run["mode"]=="plan-only" and not run["approved"]:
            raise WorkflowError("Plan needs explicit user approval")
        run["steps"][step].update(status="running",started_at=stamp(),ended_at=None)
        save(run)
        return run

def evidence_file(raw):
    if not raw: raise WorkflowError("Evidence path is mandatory")
    target=(ROOT/raw).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file() or target.stat().st_size==0:
        raise WorkflowError("Evidence must be a nonempty project-local file")
    return str(target.relative_to(ROOT))

def verify(commands):
    outcomes=[]
    for cmd in commands:
        if not isinstance(cmd,list) or not cmd or not all(isinstance(s,str) and s for s in cmd):
            raise WorkflowError("Verification commands must be argument arrays")
        try:
            cp=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=600,check=False)
            item={"command":cmd,"exit_code":cp.returncode,"passed":cp.returncode==0,
                  "stdout_tail":cp.stdout[-500:],"stderr_tail":cp.stderr[-500:]}
        except (OSError,subprocess.TimeoutExpired) as exc:
            item={"command":cmd,"passed":False,"error":str(exc)}
        outcomes.append(item)
        if not item["passed"]: break
    return outcomes

def complete(step,evidence=None,verdict=None):
    with lock():
        run=current()
        if not run: raise WorkflowError("No workflow")
        spec=step_spec(run,step)
        if not spec or run["steps"][step]["status"]!="running":
            raise WorkflowError("Step is not running")
        kind=spec.get("evidence")
        proof=[]
        if kind in ("planning_artifact","report","passing_review"):
            artifact=evidence_file(evidence)
            if kind=="planning_artifact" and not (artifact.startswith("product-owner/epics/") and run["task"] in artifact):
                raise WorkflowError("Planning artifact must be the matching EPIC task file")
            if kind=="passing_review" and verdict not in ("pass","fail"):
                raise WorkflowError("Review verdict required")
            proof=[{"artifact":artifact,"verdict":verdict,"kind":"agent_reported"}]
        elif kind=="command_gates":
            proof=verify(spec["commands"])
        else:
            raise WorkflowError("Unknown verification gate")
        success=bool(proof) and (kind!="command_gates" or all(p.get("passed") for p in proof))
        if kind=="passing_review" and verdict!="pass": success=False
        run["steps"][step].update(status="completed" if success else "failed",
                                  ended_at=stamp(),evidence=proof)
        if success and step=="planning" and run["mode"]=="plan-only":
            run["status"]="awaiting_approval"
        if success and all(v["status"]=="completed" for v in run["steps"].values()):
            run["status"]="completed"
        save(run)
        if run["status"]=="completed": ACTIVE.unlink(missing_ok=True)
        if not success: raise WorkflowError("Gate failed: review recorded evidence; repair and re-verify")
        return run

def approve(run_id):
    """Only the UserPromptSubmit hook should call this after validating a user message."""
    with lock():
        run=current()
        if not run or run["run_id"]!=run_id or run["mode"]!="plan-only" or run["status"]!="awaiting_approval":
            raise WorkflowError("No matching plan awaiting approval")
        run.update(approved=True,approved_at=stamp(),status="running")
        save(run)
        return run

def reopen(reason):
    if len(reason.strip())<8: raise WorkflowError("Provide a meaningful repair reason")
    with lock():
        run=current()
        if not run or run["status"]!="running" or not any(run["steps"][s]["status"]=="failed" for s in ("verification","review")):
            raise WorkflowError("Requires failed verification or review")
        reset=False
        for s in definition(run["workflow"])["steps"]:
            if s["id"]=="implementation": reset=True
            if reset:
                run["steps"][s["id"]]={"status":"pending","started_at":None,"ended_at":None,"evidence":[]}
        run.setdefault("rework",[]).append({"timestamp":stamp(),"reason":reason})
        save(run)
        return run

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="action",required=True)
    a=sub.add_parser("start")
    for k in ("workflow","mode","task"): a.add_argument("--"+k,required=True)
    a.add_argument("--session")
    for operation in ("begin","complete"):
        a=sub.add_parser(operation);a.add_argument("--step",required=True)
        if operation=="complete":
            a.add_argument("--evidence");a.add_argument("--verdict",choices=("pass","fail"))
    a=sub.add_parser("reopen-implementation");a.add_argument("--reason",required=True)
    sub.add_parser("status")
    args=p.parse_args()
    try:
        result=(start(args.workflow,args.mode,args.task,args.session) if args.action=="start" else
                begin(args.step) if args.action=="begin" else
                complete(args.step,args.evidence,args.verdict) if args.action=="complete" else
                reopen(args.reason) if args.action=="reopen-implementation" else current())
        print(json.dumps(result,ensure_ascii=False,indent=2));return 0
    except WorkflowError as e:
        print("WORKFLOW ERROR: "+str(e),file=sys.stderr);return 2

if __name__=="__main__":
    sys.exit(main())
