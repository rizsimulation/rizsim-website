"""Read-only Pages verification. No authentication or customer-data access."""
import concurrent.futures
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'design-code-production'
OUT.mkdir(parents=True, exist_ok=True)
SHA = os.environ.get('RIZSIM_RELEASE_SHA', '')
if not SHA or len(SHA) != 40 or any(c not in '0123456789abcdef' for c in SHA):
    raise SystemExit('Set RIZSIM_RELEASE_SHA to the exact reviewed merge commit.')
FILES = [
    'index.html', 'simulations.html', 'about.html', 'contact.html',
    'access-in.html', 'access-out.html', 'course-material-viewer.html',
    'resource-viewer.html', 'simulation-insight-to-implication.html',
    'simulation-system-1-system-2.html', 'simulation-hotel-judgment.html',
    'rizsim-design-code.css', 'rizsim-design-code.js', 'google-g.svg',
]
EXPECTED = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in FILES}


def verify(path):
    request = urllib.request.Request(
        'https://rizsim.com/' + path + '?design-code-release=' + SHA,
        headers={'User-Agent': 'RizSim-Design-Code-Release-Verification/1.0',
                 'Cache-Control': 'no-cache'},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = response.read(4_000_001)
            if len(data) > 4_000_000:
                raise ValueError('Unexpectedly large response')
            actual = hashlib.sha256(data).hexdigest()
            return {'path': path, 'passed': actual == EXPECTED[path],
                    'expected_sha256': EXPECTED[path], 'live_sha256': actual,
                    'status': response.status}
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return {'path': path, 'passed': False, 'error': str(error)}


# Pages is asynchronous; bounded deployment polling is not UI fake progress.
deadline = time.monotonic() + 540
attempt = 0
while True:
    attempt += 1
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(verify, FILES))
    failures = [r['path'] for r in results if not r['passed']]
    report = {'commit': SHA, 'attempt': attempt, 'assets': results,
              'passed': not failures,
              'scope': 'Exact public deployed assets; not authenticated production acceptance.'}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({'attempt': attempt, 'passed': len(FILES)-len(failures),
                      'total': len(FILES), 'pending': failures}), flush=True)
    if not failures:
        break
    if time.monotonic() >= deadline:
        raise SystemExit('Live assets do not yet match this commit; see report.json.')
    time.sleep(10)
