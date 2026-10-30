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
    if name=="epic-planning" and ids!=["planning"]: raise WorkflowError("Invalid epic planning steps")
    if name=="task-execution" and ids!=["implementation","verification"]: raise WorkflowError("Invalid task execution steps")
    if name=="epic-stabilization" and ids!=["verification"]: raise WorkflowError("Invalid stabilization steps")
    return data

def current():
    if not ACTIVE.exists(): return None
    pointer=json.loads(ACTIVE.read_text())
    return json.loads((RUNS/pointer["run_id"]/"state.json").read_text())

def save(run):
    write(RUNS/run["run_id"]/"state.json",run)

def epic_dir(epic_id):
    dirs=[p for p in (ROOT/"product-owner"/"epics").glob(epic_id+"-*") if p.is_dir() and (p/"epic.md").is_file()]
    if len(dirs)!=1: raise WorkflowError("Epic does not exist or is ambiguous")
    return dirs[0]

def start(workflow,mode,task,session=None,check="typecheck"):
    if mode not in ("auto","plan-only"): raise WorkflowError("Invalid mode")
    if check not in ("none","typecheck"): raise WorkflowError("Invalid quick check profile")
    d=definition(workflow)
    is_task=workflow=="task-execution"
    if not re.fullmatch(r"EPIC-[0-9]{2}-T[0-9]{2}" if is_task else r"EPIC-[0-9]{2}",task):
        raise WorkflowError("Use an EPIC-XX or EPIC-XX-TYY ID")
    epic=epic_dir(task[:7])
    task_artifact=None
    if is_task:
        plan=epic/"tasks"/"plan.md"
        if not plan.is_file() or not plan.read_text().strip():
            raise WorkflowError("Epic plan missing. Plan the epic once before task execution.")
        tasks=list((epic/"tasks").glob(task+"-*.md"))
        if len(tasks)!=1 or not tasks[0].read_text().strip():
            raise WorkflowError("Expected exactly one nonempty task file")
        task_artifact=str(tasks[0].relative_to(ROOT))
    elif workflow=="epic-stabilization" and not (epic/"tasks"/"plan.md").is_file():
        raise WorkflowError("Epic plan missing")
    with lock():
        if current() is not None: raise WorkflowError("Another workflow is active")
        run={"run_id":"run-"+uuid.uuid4().hex[:12],"workflow":workflow,
             "version":d["version"],"task":task,"mode":mode,
             "session_id":session,"status":"awaiting_approval" if is_task and mode=="plan-only" else "running",
             "approved":False,"created_at":stamp(),"check_profile":check,
             "task_artifact":task_artifact,"iterations":[],
             "steps":{e["id"]:{"status":"pending","started_at":None,"ended_at":None,"evidence":[]} for e in d["steps"]}}
        save(run);write(ACTIVE,{"run_id":run["run_id"]})
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

def complete(step,evidence=None,verdict=None,summary=None):
    with lock():
        run=current()
        if not run: raise WorkflowError("No active workflow")
        spec=step_spec(run,step)
        if not spec or run["steps"][step]["status"]!="running":
            raise WorkflowError("Step is not running")
        kind=spec.get("evidence")
        if kind=="planning_artifact":
            artifact=evidence_file(evidence)
            epic=epic_dir(run["task"])
            if artifact!=str((epic/"tasks"/"plan.md").relative_to(ROOT)):
                raise WorkflowError("Planning evidence must be the epic tasks/plan.md")
            if not list((epic/"tasks").glob(run["task"]+"-T[0-9][0-9]-*.md")):
                raise WorkflowError("Epic breakdown must contain tasks")
            proof=[{"artifact":artifact,"kind":"epic_plan"}]
        elif kind=="report":
            if summary is not None:
                note=summary.strip()
                if not 10<=len(note)<=500: raise WorkflowError("Implementation summary must be 10-500 characters")
                proof=[{"kind":"agent_reported","summary":note}]
            else:
                proof=[{"artifact":evidence_file(evidence),"kind":"agent_reported"}]
        elif kind=="quick_verification":
            if run.get("check_profile")=="none":
                if verdict not in ("pass","fail"):
                    raise WorkflowError("No-check verification requires an explicit verdict")
                if summary is not None and 10<=len(summary.strip())<=500:
                    proof=[{"kind":"manual","summary":summary.strip(),
                            "passed":verdict=="pass","automated_checks":"not_run"}]
                elif evidence:
                    proof=[{"kind":"manual","artifact":evidence_file(evidence),
                            "passed":verdict=="pass","automated_checks":"not_run"}]
                else:
                    raise WorkflowError("Manual verification requires a factual summary or evidence")
            else:
                proof=verify([["pnpm","typecheck"]])
                if verdict=="fail":proof.append({"kind":"manual","passed":False})
        elif kind=="command_gates":
            proof=verify(spec["commands"])
        else:raise WorkflowError("Unknown evidence type")
        success=bool(proof) and all(p.get("passed",True) for p in proof)
        run["steps"][step].update(status="completed" if success else "failed",ended_at=stamp(),evidence=proof)
        if success and kind=="planning_artifact" and run["mode"]=="plan-only":
            run["status"]="awaiting_approval"
        elif success and all(v["status"]=="completed" for v in run["steps"].values()):
            run["status"]="completed"
        save(run)
        if run["status"]=="completed": ACTIVE.unlink(missing_ok=True)
        if not success:raise WorkflowError("Verification failed; repair and retry")
        return run

def approve(run_id):
    with lock():
        run=current()
        if not run or run["run_id"]!=run_id or run["mode"]!="plan-only" or run["status"]!="awaiting_approval":
            raise WorkflowError("No matching user approval pending")
        run.update(approved=True,approved_at=stamp())
        run["status"]="completed" if all(x["status"]=="completed" for x in run["steps"].values()) else "running"
        save(run)
        if run["status"]=="completed":ACTIVE.unlink(missing_ok=True)
        return run

def iterate(reason,task):
    """Reuse the existing task and epic plan; rerun implementation and quick verification."""
    if len(reason.strip())<3:raise WorkflowError("Missing iteration reason")
    with lock():
        run=current()
        if not run:
            candidates=[]
            for path in RUNS.glob("*/state.json"):
                try:
                    record=json.loads(path.read_text())
                    if record.get("task")==task and record.get("workflow")=="task-execution" and record.get("status")=="completed":
                        candidates.append(record)
                except (ValueError,OSError):pass
            if not candidates:raise WorkflowError("Completed task run not found")
            run=max(candidates,key=lambda r:r["created_at"])
            write(ACTIVE,{"run_id":run["run_id"]})
        if run["workflow"]!="task-execution" or run["task"]!=task or run["status"] not in ("running","completed"):
            raise WorkflowError("Only the same task can be iterated")
        running=[k for k,v in run["steps"].items() if v["status"]=="running"]
        if running and running!=["implementation"]:raise WorkflowError("Cannot interrupt a running verification")
        if not running:
            for step in ("implementation","verification"):
                run["steps"][step]={"status":"pending","started_at":None,"ended_at":None,"evidence":[]}
        run["status"]="running"
        run.setdefault("iterations",[]).append({"timestamp":stamp(),"reason":reason})
        save(run);return run

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="action",required=True)
    a=sub.add_parser("start")
    a.add_argument("--workflow",choices=("epic-planning","task-execution","epic-stabilization"),required=True)
    a.add_argument("--mode",choices=("auto","plan-only"),default="auto")
    a.add_argument("--task",required=True)
    a.add_argument("--check",choices=("none","typecheck"),default="typecheck")
    a.add_argument("--session")
    for op in ("begin","complete"):
        a=sub.add_parser(op);a.add_argument("--step",required=True)
        if op=="complete":
            a.add_argument("--evidence");a.add_argument("--summary");a.add_argument("--verdict",choices=("pass","fail"))
    a=sub.add_parser("iterate");a.add_argument("--task",required=True);a.add_argument("--reason",required=True)
    sub.add_parser("status")
    args=p.parse_args()
    try:
        result=(start(args.workflow,args.mode,args.task,args.session,args.check) if args.action=="start" else
                begin(args.step) if args.action=="begin" else
                complete(args.step,args.evidence,args.verdict,args.summary) if args.action=="complete" else
                iterate(args.reason,args.task) if args.action=="iterate" else current())
        print(json.dumps(result,ensure_ascii=False,indent=2));return 0
    except WorkflowError as e:
        print("WORKFLOW ERROR: "+str(e),file=sys.stderr);return 2

if __name__=="__main__":
    sys.exit(main())
