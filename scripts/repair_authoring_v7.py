"""Finalize tall card geometry and scope acceptance to visible authoring controls."""
from pathlib import Path
p=Path('scripts/test_course_authoring_v7.py');s=p.read_text()
s=s.replace("p.locator('[data-course-id", "p.locator('.rz-author-course-grid [data-course-id")
s=s.replace('document.querySelectorAll("[data-course-id]")', 'document.querySelectorAll(".rz-author-course-grid [data-course-id]")')
s=s.replace("    if role=='course_lead':\n        p.locator", "    if role=='course_lead':\n        if mobile:p.locator('#mobileMenuButton').click()\n        p.locator",1)
s=s.replace("    check('Courses opens with two tall authoring paths',p.locator('.rz-author-paths .tall').count()==2)", "    check('Courses opens with two tall authoring paths',p.locator('.rz-author-paths .tall').count()==2 and p.locator('.rz-author-paths .tall').first.evaluate('e=>e.getBoundingClientRect().height>e.getBoundingClientRect().width'))")
p.write_text(s)
p=Path('rizsim-course-authoring.css');s=p.read_text().replace('max-width:900px;margin:24px auto 0;', 'max-width:820px;margin:24px auto 0;').replace('min-height:350px;padding:30px;', 'min-height:460px;padding:30px;');p.write_text(s)
print('Tall entry geometry and visible desktop/mobile authoring interactions ready for verification.')
