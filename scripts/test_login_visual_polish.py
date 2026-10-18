"""Compare actual RizSim Faculty/Student sign-in gates before/after a design-only change.
No OAuth, authentication, Student records or production calls are made.
"""
from __future__ import annotations

import functools
import http.server
import json
import re
import subprocess
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "login-design"
OUT.mkdir(parents=True, exist_ok=True)

NEW_ICON = '<img class="google-mark" src="google-g.svg" alt="" aria-hidden="true" width="20" height="20">'
OLD_ICON = '<span class="google-mark">\nG\n</span>'
NEW_CSS = '<link rel="stylesheet" href="rizsim-login-polish.css">\n'
PAGES = ("access-out.html", "access-in.html")
SIZES = {"desktop": (1440, 900), "mobile": (390, 844)}
REPORT = []


def source_contracts():
    """Compare against the now-approved login design; V14 adds a CSS link only."""
    for name in PAGES:
        baseline = subprocess.check_output(["git", "show", "origin/main:" + name], cwd=ROOT, text=True)
        actual = (ROOT / name).read_text()
        assert actual.count(NEW_CSS) == 1, f"{name}: stylesheet reference count"
        assert actual.count(NEW_ICON) == 1, f"{name}: multicolor Google icon count"
        v14_link = '<link rel="stylesheet" href="rizsim-sitewide-finish-v14.css">' + chr(10)
        assert actual.count(v14_link) == 1, f"{name}: expected one V14 CSS link"
        assert actual.replace(v14_link, "") == baseline, f"{name}: content, Javascript or page structure changed"
        assert baseline.count('id="googleLogin"') == 1
        assert actual.count('id="googleLogin"') == 1
        assert baseline.count("Continue with Google") == actual.count("Continue with Google")
    icon = (ROOT / "google-g.svg").read_text()
    for color in ("#EA4335", "#4285F4", "#FBBC05", "#34A853"):
        assert color in icon, f"Missing official Google color {color}"
    assert "<script" not in icon and "href=" not in icon and "<foreignObject" not in icon
    css = (ROOT / "rizsim-login-polish.css").read_text()
    assert "#authGate" in css and ":focus-visible" in css and "prefers-reduced-motion" in css
    assert not re.search(r"(^|\n)\s*(body|html|button|\*)\s*\{", css), "No global CSS modifications"
    print("PASS: HTML differs from production only by approved design additions", flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass


def test_visual(browser, base, label, viewport, page_name):
    context = browser.new_context(
        viewport={"width": viewport[0], "height": viewport[1]},
        reduced_motion="reduce", device_scale_factor=1,
    )
    def offline(route):
        if route.request.url.startswith(base + "/"):
            route.continue_()
        else:
            route.abort()
    context.route("**/*", offline)
    page = context.new_page()
    page.goto(base + "/" + page_name, wait_until="domcontentloaded")
    card = page.locator("#authGate .gate-card")
    button = page.locator("#authGate #googleLogin")
    card.wait_for(state="visible")
    assert button.is_visible(), f"{page_name} {label}: missing Google button"
    assert "Continue with Google" in button.inner_text()
    assert page.locator('#authGate img.gate-logo').count() == 1
    assert page.locator('#authGate #gateStatus').count() == 1
    # Assets are local, deterministic and checked on both device widths.
    page.wait_for_function("""() => [...document.querySelectorAll('#authGate img')].every(img => img.complete)""")
    box = button.bounding_box()
    cardbox = card.bounding_box()
    assert box and cardbox
    assert box["width"] >= 240 and box["height"] >= 44
    assert cardbox["width"] <= viewport[0] + 2
    metrics = page.evaluate("""() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        label: document.querySelector('#googleLogin').textContent.trim(),
        buttonBg: getComputedStyle(document.querySelector('#googleLogin')).backgroundColor,
        buttonColor: getComputedStyle(document.querySelector('#googleLogin')).color,
        transition: getComputedStyle(document.querySelector('#googleLogin')).transitionDuration,
        reducedMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        logoOk: !!document.querySelector('#authGate img.gate-logo')?.naturalWidth,
        googleLogoOk: !!document.querySelector('#authGate img.google-mark')?.naturalWidth,
    })""")
    assert metrics["logoOk"], "Approved RizSim brand logo failed to load"
    print(f"STYLE METRICS {page_name} {label}: reduced={metrics['reducedMatches']}, transition={metrics['transition']}", flush=True)
    if label == "after":
        assert metrics["googleLogoOk"], f"{page_name}: missing genuine Google G asset"
        assert metrics["buttonBg"] == "rgb(255, 255, 255)", "Google G must be on white"
        assert metrics["buttonColor"] == "rgb(31, 31, 31)", "Google button must be readable"
        assert metrics["reducedMatches"] and all(float(n.rstrip("s")) <= .001 for n in metrics["transition"].split(", ")), f"reduced-motion ignored: {metrics['transition']} / match={metrics['reducedMatches']}"
    page.screenshot(path=str(OUT / (page_name.replace(".html", "") + "-" + label + "-" + str(viewport[0]) + ".png")), full_page=True, animations="disabled")
    context.close()
    return {"button": box, "card": cardbox, **metrics}


def run():
    source_contracts()
    # 'before' screenshots load the exact approved main-branch gate HTML, with
    # <base href="/"> must precede ALL stylesheet links so baseline CSS resolves.
    before = ROOT / "__login_baseline"
    before.mkdir(exist_ok=True)
    try:
        for name in PAGES:
            html = subprocess.check_output(["git", "show", "origin/main:" + name], cwd=ROOT, text=True)
            (before / name).write_text(html.replace("<head>", '<head>\n<base href="/">', 1))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
                try:
                    for name in PAGES:
                        for device, size in SIZES.items():
                            a = test_visual(browser, base, "before", size, "__login_baseline/" + name)
                            b = test_visual(browser, base, "after", size, name)
                            assert abs(a["card"]["width"] - b["card"]["width"]) < 2, "Card width changed"
                            assert abs(a["button"]["width"] - b["button"]["width"]) < 2, "Button placement/width changed"
                            assert b["scrollWidth"] <= max(size[0] + 2, a["scrollWidth"] + 1), "New horizontal overflow introduced"
                            print(f"VISUAL WIDTH {name} {device}: viewport={size[0]}, before={a['scrollWidth']}, after={b['scrollWidth']}", flush=True)
                            assert a["label"] == b["label"] == "Continue with Google", "Approved Google login copy preserved"
                            REPORT.append({"portal": name, "device": device, "viewport": size,
                                           "before": a, "after": b})
                            print(f"PASS {name} {device} preserved layout, official G, keyboard-friendly controls", flush=True)
                finally:
                    browser.close()
        finally:
            server.shutdown()
    finally:
        for name in PAGES:
            (before / name).unlink(missing_ok=True)
        before.rmdir()
    (OUT / "verification.json").write_text(json.dumps(REPORT, indent=2))
    print("PASS: 4 before/after sign-in comparisons; no auth workflow or copy modifications", flush=True)

if __name__ == "__main__":
    run()
