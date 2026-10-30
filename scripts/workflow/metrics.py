#!/usr/bin/env python3
"""Token telemetry importer. Never infers attribution from agent role alone."""
import argparse
from collections import defaultdict
from pathlib import Path
import json
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from engine import BASE

def aggregate(records):
    seen=set()
    by_run=defaultdict(lambda:{"total_tokens":0,"input_tokens":0,"cached_input_tokens":0,"output_tokens":0})
    by_agent=defaultdict(lambda:{"total_tokens":0,"input_tokens":0,"cached_input_tokens":0,"output_tokens":0})
    by_workflow=defaultdict(lambda:{"total_tokens":0,"input_tokens":0,"cached_input_tokens":0,"output_tokens":0})
    count=0
    for rec in records:
        if not isinstance(rec,dict):continue
        rid=rec.get("usage_event_id")
        run=rec.get("workflow_run_id")
        if not isinstance(rid,str) or not rid or rid in seen or not isinstance(run,str) or not run:continue
        usage=rec.get("usage")
        if not isinstance(usage,dict):continue
        inp=usage.get("input_tokens");out=usage.get("output_tokens")
        cached=usage.get("cached_input_tokens",0)
        if any(type(x)!=int or x<0 for x in (inp,out,cached)) or cached>inp:continue
        if rec.get("source") not in ("codex_usage_delta","codex_usage_final"):
            continue
        seen.add(rid);count+=1
        fields={"total_tokens":inp+out,"input_tokens":inp,"cached_input_tokens":cached,"output_tokens":out}
        exact=all(isinstance(rec.get(k),str) and rec[k] for k in ("agent_id","agent_type","session_id","step_id"))
        agent=rec["agent_type"] if exact else "Unattributed"
        workflow=rec.get("workflow_type") or "Unattributed"
        for target in (by_run[run],by_workflow[workflow],by_agent[agent]):
            for key,value in fields.items():target[key]+=value
    def present(value):return [{"name":name,**values} for name,values in sorted(value.items())]
    return {"schema":1,"counted_events":count,"by_run":present(by_run),
            "by_workflow":present(by_workflow),"by_agent":present(by_agent),
            "note":"Only normalized verified per-event token deltas. Cumulative event snapshots must be converted to deltas before import. Missing agent IDs are Unattributed."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True,help="Normalized usage JSONL, containing verified per-event deltas")
    args=p.parse_args()
    path=Path(args.input).resolve()
    if not path.is_file():p.error("Input file does not exist")
    rows=[]
    for line in path.read_text().splitlines():
        try:rows.append(json.loads(line))
        except ValueError:continue
    result=aggregate(rows)
    dest=BASE/"reports"/"token-usage.json"
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"report":str(dest),"counted_events":result["counted_events"]}))
if __name__=="__main__":main()
