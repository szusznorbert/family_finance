"""Deterministic rapid workflow regression checks."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import engine
import metrics

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.original=[engine.ROOT,engine.BASE,engine.RUNS,engine.ACTIVE,engine.WF]
        root=Path(self.tmp.name)
        engine.ROOT=root;engine.BASE=root/".workflow"
        engine.RUNS=engine.BASE/"runs";engine.ACTIVE=engine.BASE/"active.json"
        engine.WF=root/".codex"/"workflows";engine.WF.mkdir(parents=True)
        for name,body in {
          "epic-planning":"""id: epic-planning
version: 2
steps:
  - {id: planning, agent: product_owner, depends_on: [], evidence: planning_artifact}
""",
          "task-execution":"""id: task-execution
version: 2
steps:
  - {id: implementation, agent: main, depends_on: [], evidence: report}
  - {id: verification, agent: main, depends_on: [implementation], evidence: quick_verification}
""",
          "epic-stabilization":"""id: epic-stabilization
version: 2
steps:
  - {id: verification, agent: main, depends_on: [], evidence: command_gates, commands: [[python3, --version]]}
""",
        }.items():
            (engine.WF/(name+".yaml")).write_text(body)
        self.epic=root/"product-owner"/"epics"/"EPIC-09-governance"
        (self.epic/"tasks").mkdir(parents=True)
        (self.epic/"epic.md").write_text("Epic specification")
        (self.epic/"tasks"/"EPIC-09-T02-workflow.md").write_text("Acceptance criteria")
    def tearDown(self):
        engine.ROOT,engine.BASE,engine.RUNS,engine.ACTIVE,engine.WF=self.original
        self.tmp.cleanup()
    def plan(self):
        engine.start("epic-planning","auto","EPIC-09")
        engine.begin("planning")
        (self.epic/"tasks"/"plan.md").write_text("Dependencies and task breakdown")
        engine.complete("planning","product-owner/epics/EPIC-09-governance/tasks/plan.md")
    def implement(self,check="none"):
        engine.start("task-execution","auto","EPIC-09-T02",check=check)
        engine.begin("implementation")
        engine.complete("implementation",summary="Implemented task acceptance criteria.")
    def test_planning_once_required(self):
        with self.assertRaises(engine.WorkflowError):
            engine.start("task-execution","auto","EPIC-09-T02")
        self.plan();self.implement()
        with self.assertRaises(engine.WorkflowError):engine.begin("implementation")
    def test_deterministic_steps(self):
        self.plan()
        engine.start("task-execution","auto","EPIC-09-T02",check="none")
        with self.assertRaises(engine.WorkflowError):engine.begin("verification")
        engine.begin("implementation")
        engine.complete("implementation",summary="Completed requested implementation.")
        engine.begin("verification")
        result=engine.complete("verification",summary="Reviewed cosmetic output manually.",verdict="pass")
        self.assertEqual(result["status"],"completed")
    def test_plan_only_waits_for_user(self):
        self.plan()
        run=engine.start("task-execution","plan-only","EPIC-09-T02")
        with self.assertRaises(engine.WorkflowError):engine.begin("implementation")
        with self.assertRaises(engine.WorkflowError):engine.approve("run-aaaaaaaaaaaa")
        engine.approve(run["run_id"])
        engine.begin("implementation")
    def test_failed_verification_is_not_complete(self):
        self.plan();self.implement()
        engine.begin("verification")
        with self.assertRaises(engine.WorkflowError):
            engine.complete("verification",verdict="fail",summary="Manual inspection found a problem.")
        self.assertEqual(engine.current()["steps"]["verification"]["status"],"failed")
    def test_iterate_invalidates_verification(self):
        self.plan();self.implement()
        engine.begin("verification")
        engine.complete("verification",verdict="pass",summary="Manually checked the changed label.")
        run=engine.iterate("Adjust label", "EPIC-09-T02")
        self.assertEqual(run["steps"]["verification"]["status"],"pending")
        self.assertEqual(run["steps"]["implementation"]["status"],"pending")
        self.assertEqual(len(run["iterations"]),1)
    def test_fast_default_typecheck(self):
        self.plan();self.implement(check="typecheck")
        engine.begin("verification")
        with patch.object(engine,"verify",return_value=[{"passed":True}]) as spy:
            engine.complete("verification")
        spy.assert_called_once_with([["pnpm","typecheck"]])
    def test_stabilization_gates(self):
        self.plan()
        engine.start("epic-stabilization","auto","EPIC-09")
        engine.begin("verification")
        with patch.object(engine,"verify",return_value=[{"passed":True}]) as spy:
            engine.complete("verification")
        spy.assert_called_once_with([["python3","--version"]])
    def test_no_duplicate_workflow(self):
        self.plan()
        engine.start("task-execution","auto","EPIC-09-T02")
        with self.assertRaises(engine.WorkflowError):
            engine.start("task-execution","auto","EPIC-09-T02")
    def test_token_dedup(self):
        row={"usage_event_id":"e1","workflow_run_id":"run-1","workflow_type":"task-execution",
             "source":"codex_usage_delta","usage":{"input_tokens":100,"output_tokens":25,"cached_input_tokens":10}}
        result=metrics.aggregate([row,row])
        self.assertEqual(result["by_run"][0]["total_tokens"],125)
        self.assertEqual(result["by_agent"][0]["name"],"Unattributed")

if __name__=="__main__":unittest.main()
