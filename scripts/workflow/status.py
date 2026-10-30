#!/usr/bin/env python3
"""Derive epic/task progress from accepted task files and workflow run evidence.

No AI inference or manually synchronized status fields. Missing runs are Untracked,
not Completed. Reads project-local metadata only.
"""
import json
from pathlib import Path
import re
import sys

sys.path.insert(0,str(Path(__file__).resolve().parent))
import engine

TASK_RE=re.compile(r"^(EPIC-\d{2}-T\d{2})-.+\.md$")
EPIC_RE=re.compile(r"^(EPIC-\d{2})-.+$")

def all_runs():
    output=[]
    if not engine.RUNS.exists():
        return output
    for path in engine.RUNS.glob("*/state.json"):
        try:
            obj=json.loads(path.read_text())
            if isinstance(obj,dict) and isinstance(obj.get("task"),str):
                output.append(obj)
        except (ValueError,OSError):
            continue
    return output

def latest_run(runs, task, workflow):
    matches=[r for r in runs if r.get("task")==task and r.get("workflow")==workflow]
    if not matches:
        return None
    return max(matches,key=lambda r:(r.get("created_at") or "",r.get("run_id") or ""))

def summarized_run(run):
    if not run:
        return {"status":"untracked","run_id":None,"step":None,"blocker":None,"updated_at":None}
    steps=run.get("steps") or {}
    running=next((k for k,v in steps.items() if isinstance(v,dict) and v.get("status")=="running"),None)
    failed=next((k for k,v in steps.items() if isinstance(v,dict) and v.get("status")=="failed"),None)
    status=run.get("status","unknown")
    if failed:
        status="blocked"
    blocker=("Step failed: "+failed if failed else
             "Awaiting user approval" if status=="awaiting_approval" else None)
    return {"status":status,"run_id":run.get("run_id"),"step":running or failed,
            "blocker":blocker,"updated_at":max(
                (v.get("ended_at") or v.get("started_at") or "" for v in steps.values() if isinstance(v,dict)),
                default=run.get("created_at") or "")}

def snapshot():
    runs=all_runs()
    active=engine.current()
    epics=[]
    root=engine.ROOT/"product-owner"/"epics"
    if not root.exists():
        return {"epics":[],"active":summarized_run(active)}
    for folder in sorted(root.iterdir()):
        if not folder.is_dir():
            continue
        m=EPIC_RE.fullmatch(folder.name)
        if not m or not (folder/"epic.md").is_file():
            continue
        epic_id=m.group(1)
        task_files=sorted((folder/"tasks").glob("*.md")) if (folder/"tasks").exists() else []
        task_ids=sorted({x.group(1) for f in task_files if (x:=TASK_RE.fullmatch(f.name))})
        task_info=[]
        for task_id in task_ids:
            state=summarized_run(latest_run(runs,task_id,"task-execution"))
            task_info.append({"id":task_id,**state})
        planned=(folder/"tasks"/"plan.md").is_file()
        planning=summarized_run(latest_run(runs,epic_id,"epic-planning"))
        stabilization=summarized_run(latest_run(runs,epic_id,"epic-stabilization"))
        completed=sum(t["status"]=="completed" for t in task_info)
        blocked=any(t["status"]=="blocked" for t in task_info)
        has_active=bool(active and (active.get("task")==epic_id or active.get("task","").startswith(epic_id+"-")))
        if stabilization["status"]=="completed":
            state="completed"
        elif blocked:
            state="blocked"
        elif has_active:
            state="in_progress"
        elif task_ids and completed==len(task_ids):
            state="ready_for_stabilization"
        elif completed:
            state="in_progress"
        elif planned:
            state="planned"
        else:
            state="unplanned"
        epics.append({"id":epic_id,"name":folder.name,"status":state,"planned":planned,
                      "planning":planning,"stabilization":stabilization,
                      "completed_tasks":completed,"total_tasks":len(task_ids),"tasks":task_info})
    return {"epics":epics,"active":summarized_run(active),"active_task":active.get("task") if active else None,
            "note":"Statuses derive only from local workflow records; existing work without run evidence is Untracked."}

if __name__=="__main__":
    print(json.dumps(snapshot(),indent=2))
