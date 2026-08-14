#!/usr/bin/env python3
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
files=[]
for p in [ROOT/'README.md', ROOT/'config/example.env', ROOT/'src-tauri/README.md', ROOT/'src-tauri/icons/README.md']:
    if p.exists(): files.append(p)
docs=ROOT/'docs'
if docs.exists():
    files += [p for p in docs.rglob('*.md') if 'history' not in p.parts]
patterns=[
    (re.compile(r'已由\s*CI\s*全量验证'), 'permanent CI-verified claim'),
    (re.compile(r'\bPhase\s+[ABCD]\b', re.I), 'historical Phase used in current docs'),
    (re.compile(r'\bPhase[0-9][A-Za-z0-9_-]*\b', re.I), 'historical Phase marker used in current docs'),
    (re.compile(r'OWNER\s+LATER|This page is a placeholder|本页面为占位内容', re.I), 'placeholder/owner-later current documentation'),
]
fail=[]
for p in sorted(set(files)):
    for n,line in enumerate(p.read_text(errors='ignore').splitlines(),1):
        # A current README may link to the history archive and name that archived phase.
        if 'docs/history/' in line or '历史计划' in line:
            continue
        for rx,label in patterns:
            if rx.search(line): fail.append(f'{p.relative_to(ROOT)}:{n}: {label}: {line.strip()}')
if fail:
    print('current-docs truthfulness gate failed:\n'+'\n'.join(fail), file=sys.stderr); sys.exit(1)
print(f'current-docs truthfulness gate passed: {len(set(files))} current operator/developer documents')
