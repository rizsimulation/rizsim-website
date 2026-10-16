"""Corrections found by isolated SQL/browser execution; do not touch live accounts."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'sql/course_runtime_v6.sql';s=p.read_text().replace('order by course_title,sort_order,created_at;', 'order by 3,11,12;');p.write_text(s)
p=ROOT/'scripts/sql/runtime_test_schema.sql';s=p.read_text().replace('security definer as $$','security definer set search_path=public as $$');p.write_text(s)
for name in ['test_live_classroom_v5.py','test_course_environment_v6.py']:
 p=ROOT/'scripts'/name;s=p.read_text()
 s=re.sub(r"(\w+\.locator\('\[data-rz-run-product=[^\]]+\]'\))\.hover\(\)", r"\1.locator('..').hover()", s)
 p.write_text(s)
print('SQL UNION ordering corrected; legacy SQL doubles match production search_path; hover reveals through the card.')
