#!/usr/bin/env python3
"""Read-only localhost activity dashboard for the current Codex workflow."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse,json,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from engine import BASE,RUNS,current,definition

def snapshot():
    run=current()
    if not run and RUNS.exists():
        files=sorted(RUNS.glob("*/state.json"),key=lambda x:x.stat().st_mtime,reverse=True)
        if files:run=json.loads(files[0].read_text())
    if not run:return {"status":"idle","steps":[],"events":[],"usage":None}
    steps=[{"id":s["id"],"agent":s["agent"],**run["steps"][s["id"]]} for s in definition(run["workflow"])["steps"]]
    running=next((s for s in steps if s["status"]=="running"),None)
    events=[]
    path=BASE/"telemetry"/"agent-events.jsonl"
    if path.exists():
        for line in path.read_text(errors="replace").splitlines():
            try:
                e=json.loads(line)
                if e.get("run_id")==run["run_id"]:
                    events.append({k:e.get(k) for k in ("at","step","event","agent_id","agent_type")})
            except (ValueError,TypeError):pass
    usage=None
    path=BASE/"reports"/"token-usage.json"
    if path.exists():
        try:
            usage=next((x for x in json.loads(path.read_text()).get("by_run",[]) if x["name"]==run["run_id"]),None)
        except (ValueError,TypeError):pass
    return {"run_id":run["run_id"],"workflow":run["workflow"],"task":run["task"],
            "mode":run["mode"],"status":run["status"],"current_step":running["id"] if running else None,
            "current_agent":running["agent"] if running else None,
            "steps":steps,"events":events[-30:],"usage":usage}

PAGE='''<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Family Finance Codex Activity</title>
<style>
:root{color-scheme:dark;background:#101820;color:#edf5fc;font:15px system-ui}
body{max-width:980px;margin:32px auto;padding:0 16px}
h1{font-size:24px}h2{font-size:18px}
.panel{background:#1d2b38;border:1px solid #35485a;border-radius:12px;padding:16px;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.muted{color:#b5c4d1}.value{font-weight:700;font-size:20px}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:9px;border-bottom:1px solid #35485a}
.completed{color:#80dbac}.running{color:#9dcbff}.failed{color:#ffa4a4}
</style>
<h1>Codex Activity <small class="muted">local</small></h1><div class="panel" id="summary">Loading…</div>
<div class="grid" id="cards"></div><h2>Workflow steps</h2><div class="panel" id="steps"></div>
<h2>Agent lifecycle events</h2><div class="panel" id="events"></div>
<p class="muted">Frissítés: 2 másodpercenként. A tokenek csak ellenőrzött hozzárendelés esetén agent-szintűek. A hiányzó adat nem nulla.</p>
<script>
const esc=x=>String(x??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const card=(k,v)=>'<div class="panel"><div class="muted">'+esc(k)+'</div><div class="value">'+esc(v)+'</div></div>';
async function refresh(){
try{
const r=await fetch("/api/activity",{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
const d=await r.json();
if(d.status==="idle"){document.getElementById("summary").textContent="Nincs aktív workflow";return;}
document.getElementById("summary").innerHTML='<strong>'+esc(d.workflow)+'</strong> · '+esc(d.task)+' · '+esc(d.mode)+'<p class="muted">'+esc(d.run_id)+' · '+esc(d.status)+'</p>';
document.getElementById("cards").innerHTML=card("Current step",d.current_step)+card("Assigned agent",d.current_agent)+card("Workflow status",d.status)+card("Observed tokens",d.usage?.total_tokens??"Unknown");
document.getElementById("steps").innerHTML='<table><tr><th>Step</th><th>Agent</th><th>Status</th></tr>'+d.steps.map(s=>'<tr><td>'+esc(s.id)+'</td><td>'+esc(s.agent)+'</td><td class="'+esc(s.status)+'">'+esc(s.status)+'</td></tr>').join("")+'</table>';
document.getElementById("events").innerHTML=d.events.length?'<table><tr><th>Time</th><th>Event</th><th>Agent</th><th>Step</th></tr>'+d.events.slice(-12).reverse().map(e=>'<tr><td>'+esc(e.at)+'</td><td>'+esc(e.event)+'</td><td>'+esc(e.agent_type||e.agent_id)+'</td><td>'+esc(e.step)+'</td></tr>').join("")+'</table>':"Még nincs subagent esemény.";
}catch(e){document.getElementById("summary").textContent="Activity error: "+e.message;}
}
refresh();setInterval(refresh,2000);
</script></html>'''
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path=="/api/activity":
            body=json.dumps(snapshot()).encode()
            content_type="application/json; charset=utf-8"
        elif self.path=="/":
            body=PAGE.encode();content_type="text/html; charset=utf-8"
        else:
            self.send_error(404);return
        self.send_response(200)
        self.send_header("Content-Type",content_type)
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers();self.wfile.write(body)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=8765)
    args=parser.parse_args()
    if not 1024<=args.port<=65535:parser.error("Use an unprivileged local port")
    print("Codex Activity: http://127.0.0.1:"+str(args.port),flush=True)
    ThreadingHTTPServer(("127.0.0.1",args.port),Handler).serve_forever()
