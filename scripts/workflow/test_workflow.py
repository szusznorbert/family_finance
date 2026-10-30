"""Workflow ordering and attribution regression tests."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import engine
import metrics

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.oldroot,self.oldbase,self.oldruns,self.oldactive,self.oldwf=(engine.ROOT,engine.BASE,engine.RUNS,engine.ACTIVE,engine.WF)
        root=Path(self.tmp.name)
        engine.ROOT=root
        engine.BASE=root/".workflow";engine.RUNS=engine.BASE/"runs";engine.ACTIVE=engine.BASE/"active.json"
        engine.WF=root/".codex"/"workflows"
        engine.WF.mkdir(parents=True)
        (engine.WF/"new-feature.yaml").write_text("""
id: new-feature
version: 1
steps:
  - {id: planning, agent: product_owner, depends_on: [], evidence: planning_artifact}
  - {id: design, agent: architect, depends_on: [planning], evidence: report}
  - {id: implementation, agent: developer, depends_on: [design], evidence: report}
  - {id: verification, agent: tester, depends_on: [implementation], evidence: command_gates, commands: [[python3, --version]]}
  - {id: review, agent: reviewer, depends_on: [verification], evidence: passing_review}
""")
        task=root/"product-owner"/"epics"/"epic"/"tasks"/"EPIC-09-T02-workflow.md"
        task.parent.mkdir(parents=True);task.write_text("# Reviewed plan\n")
        self.plan=str(task.relative_to(root))
        (root/"report.md").write_text("# Completed step\n")
    def tearDown(self):
        engine.ROOT,engine.BASE,engine.RUNS,engine.ACTIVE,engine.WF=self.oldroot,self.oldbase,self.oldruns,self.oldactive,self.oldwf
        self.tmp.cleanup()
    def advance(self,step,evidence=None,verdict=None):
        engine.begin(step)
        return engine.complete(step,evidence,verdict)
    def test_dependency_order(self):
        engine.start("new-feature","auto","EPIC-09-T02")
        with self.assertRaises(engine.WorkflowError):engine.begin("implementation")
        self.advance("planning",self.plan)
        self.advance("design","report.md")
        self.advance("implementation","report.md")
        self.advance("verification")
        run=self.advance("review","report.md","pass")
        self.assertEqual(run["status"],"completed")
    def test_plan_only_pauses(self):
        run=engine.start("new-feature","plan-only","EPIC-09-T02")
        self.advance("planning",self.plan)
        self.assertEqual(engine.current()["status"],"awaiting_approval")
        with self.assertRaises(engine.WorkflowError):engine.begin("design")
        engine.approve(run["run_id"])
        self.advance("design","report.md")
        self.assertEqual(engine.current()["steps"]["design"]["status"],"completed")
    def test_wrong_approval_rejected(self):
        engine.start("new-feature","plan-only","EPIC-09-T02")
        self.advance("planning",self.plan)
        with self.assertRaises(engine.WorkflowError):engine.approve("run-aaaaaaaaaaaa")
    def test_failed_review_and_rework(self):
        engine.start("new-feature","auto","EPIC-09-T02")
        self.advance("planning",self.plan);self.advance("design","report.md")
        self.advance("implementation","report.md");self.advance("verification")
        engine.begin("review")
        with self.assertRaises(engine.WorkflowError):engine.complete("review","report.md","fail")
        self.assertEqual(engine.current()["steps"]["review"]["status"],"failed")
        engine.reopen("Need to fix reviewer findings")
        self.assertEqual(engine.current()["steps"]["implementation"]["status"],"pending")
    def test_no_concurrent_workflow(self):
        engine.start("new-feature","auto","EPIC-09-T02")
        with self.assertRaises(engine.WorkflowError):engine.start("new-feature","auto","EPIC-09-T02")
    def test_invalid_plan_artifact(self):
        engine.start("new-feature","auto","EPIC-09-T02")
        engine.begin("planning")
        with self.assertRaises(engine.WorkflowError):engine.complete("planning","report.md")
    def test_fail_closed_verification(self):
        engine.start("new-feature","auto","EPIC-09-T02")
        self.advance("planning",self.plan);self.advance("design","report.md")
        self.advance("implementation","report.md")
        with patch.object(engine,"verify",return_value=[{"passed":False,"exit_code":1}]):
            engine.begin("verification")
            with self.assertRaises(engine.WorkflowError):engine.complete("verification")
        with self.assertRaises(engine.WorkflowError):engine.begin("review")
    def test_duplicate_token_event_excluded(self):
        rec={"usage_event_id":"e1","workflow_run_id":"r1","workflow_type":"new-feature",
             "source":"codex_usage_delta","usage":{"input_tokens":120,"cached_input_tokens":20,"output_tokens":30}}
        result=metrics.aggregate([rec,rec])
        self.assertEqual(result["by_run"][0]["total_tokens"],150)
        self.assertEqual(result["by_agent"][0]["name"],"Unattributed")

if __name__=="__main__":unittest.main()
