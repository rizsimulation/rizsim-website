"""Verify exact Courses authoring release bytes; no authenticated or data-writing requests."""
import verify_live_classroom_release as release
release.ASSETS += (
    'rizsim-course-service.js', 'rizsim-course-environment.js', 'rizsim-course-environment.css',
    'rizsim-course-authoring-service.js', 'rizsim-course-authoring.js', 'rizsim-course-authoring.css',
)
if __name__ == '__main__':
    raise SystemExit(release.main())
