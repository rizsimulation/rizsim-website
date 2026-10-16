"""Read-only HTTP delivery verification. Not a signed-in student rehearsal."""
import verify_live_classroom_release as base
base.ASSETS=base.ASSETS+('rizsim-course-service.js','rizsim-course-environment.js','rizsim-course-environment.css','rizsim-course-authoring-service.js','rizsim-course-authoring.js','rizsim-course-authoring.css','rizsim-student-workspace.js','rizsim-student-workspace.css','rizsim-shared-home.js')
if __name__=='__main__':raise SystemExit(base.main())
