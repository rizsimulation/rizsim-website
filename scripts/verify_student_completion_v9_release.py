"""V9 read-only delivery check: includes all 21 V8 assets plus the simulation results runner."""
import verify_student_workspace_release as base
base.base.ASSETS=base.base.ASSETS+('simulation-test.html',)
if __name__=='__main__':raise SystemExit(base.base.main())
