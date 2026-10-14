#!/usr/bin/env python3
"""Static release assertions for category-specific RizSim environments."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "simulations.html", "about.html", "contact.html"]
PORTALS = ["access-in.html", "access-out.html"]
FAIL = []


class Markup(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicate_ids = set()
        self.links = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        info = dict(attrs)
        ident = info.get("id")
        if ident:
            if ident in self.ids:
                self.duplicate_ids.add(ident)
            self.ids.add(ident)
        if tag == "a":
            self.links.append(info)
        if tag == "script":
            self.scripts.append(info)


def check(condition, note):
    if not condition:
        FAIL.append(note)


for page in PAGES + PORTALS:
    text = (ROOT / page).read_text(encoding="utf-8")
    parsed = Markup()
    parsed.feed(text)
    check(not parsed.duplicate_ids, page + ": duplicate IDs " + repr(parsed.duplicate_ids))
    check('rizsim-experiences.css' in text, page + ": missing shared sidebar styling")
    check('rizsim-experiences.js' in text, page + ": missing category controller")
    check('rizsim-roles-library.js' in text, page + ": missing verified role controls")

for page in PORTALS:
    text = (ROOT / page).read_text(encoding="utf-8")
    check('id="view-resources"' in text, page + ": missing independent library view")
    check('id="rzHiddenLibraryNav"' in text, page + ": missing private library navigation")
    check('persistSession:true' in text, page + ": session persistence not explicit")
    check('src="rizsim-shared-home.js"' in text, page + ": existing shared Home lost")
    check('id="siteSidebar"' in text, page + ": missing sidebar drawer")
    check('id="sidebarToggle"' in text, page + ": missing sidebar toggle")

home = (ROOT / "index.html").read_text(encoding="utf-8")
for slug in ("learning", "skills", "children"):
    check("simulations.html?category=" + slug in home, "missing general Home tile " + slug)
check('id="rizsimSplash"' in home, "approved splash missing")
check("rizsim-home-v2-premium" in home, "approved premium V2 style missing")
check('rizsim-announcement-card' in home, "launch offer missing")

site = (ROOT / "simulations.html").read_text(encoding="utf-8")
check("data-category=" in site, "public category filter lost")
for page in PAGES:
    parsed = Markup()
    parsed.feed((ROOT / page).read_text(encoding="utf-8"))
    links = [p.get("href") for p in parsed.links if p.get("href")]
    check("ebooks.html" not in links, page + ": eBooks must stay in sidebar")
library = (ROOT / "rizsim-roles-library.js").read_text(encoding="utf-8")
check('select("role,active")' in library, "workspace availability must be database-confirmed")
check("access_out_members" in library, "missing membership verification")
check("get_my_rizsim_resource_catalogue" in library, "missing authorized student resource source")
shared = (ROOT / "rizsim-shared-home.js").read_text(encoding="utf-8")
check('rizsim-experiences.css' in shared, "dashboard Home category tiles styles missing")
check('selectedCategory' in shared, "dashboard Home category links not routed")
nav = (ROOT / "rizsim-experiences.js").read_text(encoding="utf-8")
check("data-rz-library" in nav, "sidebar-only eBook entry missing")
check("closeDrawer" in nav, "drawer close support missing")

if FAIL:
    print("FAIL")
    for item in FAIL:
        print(" -", item)
    sys.exit(1)
print("PASS: RizSim category, session, Home and sidebar static invariants")
