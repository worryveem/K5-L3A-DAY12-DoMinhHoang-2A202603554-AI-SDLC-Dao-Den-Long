import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

root = Path.cwd().resolve()
archive = root / 'artifacts/dao-den-long-v1.0.0-web.zip'
archive.parent.mkdir(exist_ok=True)
tracked = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z']).decode('utf-8').split('\0')
paths = set(p for p in tracked if p and (root / p).is_file())
paths.update(p.relative_to(root).as_posix() for p in (root / 'dist').rglob('*') if p.is_file())
assert all(not ({'.git', 'node_modules', '.local', '.work', 'artifacts'} & set(Path(p).parts)) for p in paths)
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in sorted(paths):
        z.write(root / name, 'dao-den-long-v1.0.0/' + name)
    z.writestr('dao-den-long-v1.0.0/RUN.txt',
        'Dao Den Long v1.0.0 - Web release package\n'
        'Requires Node.js 22+ and a WebGL2 browser.\n'
        'From this extracted folder run: node scripts/serve.mjs\n'
        'Open http://localhost:4173\n'
        'The dist folder is prebuilt; no npm install is needed to play.\n'
        'See README.md for source build, tests, headless, benchmark and soak.\n'
        'Demo: docs/demo/demo.mp4 (automated replay, not manual gameplay).\n'
        'See README.md and the GitHub Actions run for publication status.\n')

tmp_base = Path(tempfile.gettempdir()).resolve()
temp = Path(tempfile.mkdtemp(prefix='dao-release-check-')).resolve()
assert temp.parent == tmp_base and temp.name.startswith('dao-release-check-')
server = None
try:
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for entry in z.infolist():
            assert (temp / entry.filename).resolve().is_relative_to(temp)
        z.extractall(temp)
    unpacked = temp / 'dao-den-long-v1.0.0'
    env = dict(os.environ, PORT='0', LANTERN_DATA_DIR=str(temp / 'scores'))
    server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=unpacked, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
    line = server.stdout.readline()
    match = re.search(r'http://localhost:(\d+)', line)
    assert match, repr(line)
    base = 'http://127.0.0.1:' + match[1]
    http = {}
    for url in ['/', '/app.mjs', '/view.mjs', '/src/core/game.mjs', '/vendor/three.module.js',
                '/vendor/three.core.js', '/vendor/THREE-LICENSE.txt', '/game.contract.json', '/api/leaderboard']:
        with urllib.request.urlopen(base + url, timeout=10) as response:
            data = response.read()
            assert response.status == 200 and data
            http[url] = {'status': response.status, 'bytes': len(data)}
            if url == '/api/leaderboard':
                assert json.loads(data) == {'entries': []}
    headless_out = temp / 'headless.jsonl'
    run = subprocess.run(['node', 'src/headless.mjs', '--seed', '42', '--night', '1', '--ticks', '2',
        '--scenario', 'tests/scenarios/phase-3/dawn-survived.scenario.json',
        '--inputs', 'tests/scenarios/phase-3/dawn-survived.inputs.json', '--out', str(headless_out)],
        cwd=unpacked, capture_output=True, text=True, encoding='utf-8', timeout=30)
    assert run.returncode == 0, run.stderr
    end = json.loads(headless_out.read_text('utf-8').splitlines()[-1])
    assert end['type'] == 'end' and end['state'] == 'won', end
    report = {
        'recorded_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'archive': archive.relative_to(root).as_posix(),
        'archive_bytes': archive.stat().st_size,
        'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'packaged_files': len(paths) + 1,
        'zip_integrity': 'passed',
        'extracted_outside_workspace': True,
        'dependencies_installed_for_play_check': False,
        'http': http,
        'headless_end': end,
        'base_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip(),
        'publication': 'Archive verification only; this report does not assert GitHub publication.'
    }
    (root / 'docs/proof/phase-4/package-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
finally:
    if server is not None:
        server.terminate()
        server.wait(timeout=10)
    # Only delete the exact generated temporary folder, verified under the OS temp root.
    assert temp.resolve().parent == tmp_base and temp.name.startswith('dao-release-check-')
    shutil.rmtree(temp)
