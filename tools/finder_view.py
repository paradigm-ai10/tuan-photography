#!/usr/bin/env python3
"""Finder 整理 — keeps the top of the project folder down to his own things.

He opens this folder to drop photos in, read the build list, write a note or start the site.
The notes, the scripts and the website's own files are in his way there, so they are flagged
hidden for Finder. Nothing is moved or renamed: every tool, link and git finds each file
where it always was. Finder shows them again with Cmd + Shift + . (full stop).

    python3 tools/finder_view.py          hide the working files
    python3 tools/finder_view.py --show   show everything again

Safe to rerun. Rerun it after adding or replacing anything at the top level: a file that is
written afresh loses the flag. Anything not named in HIDE is left alone, so what he puts in
the folder himself always stays in view.
"""
import os
import stat
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HIDE = ['CLAUDE.md', 'DESIGN.md', 'PRODUCT.md', 'PROGRESS.md', 'IDEAS.md', 'TODO.md',
        'index.html', 'content', 'data', 'tools', 'design 1', 'design 2', 'elements']
# His, but only worth seeing while a trial is open.
HIDE_WHEN_EMPTY = ['experiments']


def flag(path, hidden):
    now = os.stat(path).st_flags
    want = now | stat.UF_HIDDEN if hidden else now & ~stat.UF_HIDDEN
    if want != now:
        os.chflags(path, want)


def empty(folder):
    return not any(item.name != '.DS_Store' for item in folder.iterdir())


def main(show=False):
    for name in HIDE + HIDE_WHEN_EMPTY:
        path = ROOT / name
        if path.exists():
            flag(path, not show and (name in HIDE or empty(path)))
    seen = sorted(item.name for item in ROOT.iterdir()
                  if not item.name.startswith('.')
                  and not os.stat(item).st_flags & stat.UF_HIDDEN)
    print('Finder 看得到的:' + '、'.join(seen))


if __name__ == '__main__':
    main(show='--show' in sys.argv)
