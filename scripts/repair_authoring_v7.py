"""Scope acceptance selectors to the new authoring grid, never hidden legacy views."""
from pathlib import Path
p=Path('scripts/test_course_authoring_v7.py');s=p.read_text()
s=s.replace("p.locator('[data-course-id", "p.locator('.rz-author-course-grid [data-course-id")
s=s.replace('document.querySelectorAll("[data-course-id]")', 'document.querySelectorAll(".rz-author-course-grid [data-course-id]")')
p.write_text(s)
print('Authoring card checks now count only visible authoring library cards.')
