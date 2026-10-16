"""Read-only public asset verification; no login, backend mutation or paid service."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import os
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://rizsim.com'
ASSETS = (
    'access-out.html', 'rizsim-live-classroom.js', 'rizsim-live-classroom.css',
    'rizsim-faculty-workspaces.js', 'rizsim-session-confirmation.js', 'rizsim-qr.js',
    'access-in.html', 'index.html', 'site.js', 'site.css',
    'rizsim-r.png', 'RizSim finalized logo.png',
)


def verify(path: str, revision: str) -> dict:
    expected = sha256((ROOT / path).read_bytes()).hexdigest()
    url = BASE + '/' + quote(path) + '?release=' + quote(revision)
    result = {'path': path, 'expected_sha256': expected, 'match': False}
    try:
        request = Request(url, headers={
            'User-Agent': 'RizSim-Release-Verification/1.0',
            'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache',
        })
        with urlopen(request, timeout=20) as response:
            data = response.read()
            actual = sha256(data).hexdigest()
            same_origin = urlparse(response.geturl()).hostname == 'rizsim.com'
            result.update(http_status=response.status, actual_sha256=actual,
                          size_bytes=len(data), same_origin=same_origin,
                          content_type=response.headers.get('Content-Type', ''),
                          match=response.status == 200 and same_origin and actual == expected)
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        result['error'] = str(error)
    return result


def main() -> int:
    revision = os.environ.get('RIZSIM_RELEASE_SHA', '').strip()
    if len(revision) != 40 or any(c not in '0123456789abcdef' for c in revision):
        raise ValueError('RIZSIM_RELEASE_SHA must identify the exact checked-out release.')
    deadline = time.monotonic() + 360
    attempts = 0
    rows = []
    while True:
        attempts += 1
        with ThreadPoolExecutor(max_workers=6) as pool:
            rows = list(pool.map(lambda path: verify(path, revision), ASSETS))
        mismatches = [row['path'] for row in rows if not row['match']]
        print('Attempt', attempts, ':', len(ASSETS) - len(mismatches), '/', len(ASSETS), 'match', flush=True)
        if not mismatches or time.monotonic() >= deadline:
            break
        print('Awaiting matching Pages assets:', ', '.join(mismatches), flush=True)
        time.sleep(10)
    passed = all(row['match'] for row in rows)
    report = {
        'revision': revision, 'base_url': BASE, 'status': 'passed' if passed else 'failed',
        'checked_at_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'method': 'SHA-256 comparison of public HTTP responses to exact committed files',
        'scope': 'Public release bytes only; does not assert authenticated user acceptance.',
        'attempts': attempts, 'assets': rows,
    }
    output = ROOT / 'test-results' / 'production-verification.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    for row in rows:
        print(('PASS' if row['match'] else 'FAIL'), row['path'], row.get('actual_sha256', row.get('error', '')))
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
