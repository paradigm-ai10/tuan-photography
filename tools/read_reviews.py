#!/usr/bin/env python3
"""Version Review kit: what he said, in plain text, for Claude. Read-only.

    python3 tools/read_reviews.py ideas/reviews/journey.json [--manifest "design 2/new/review-manifest.json"] [--since 2026-11-01]

For each version: its number, title, score word, when he saw it; his marks (Like or Change, tags,
phrases, words, what was under the click); his overall note; what he kept it over in Compare.
Then what he keeps saying, counted, and the marks not yet done. The versions the manifest's
"ask" names come first, with which of them still have no score. With a round (manifest "round",
else "ask"), this round is numbered first, as the hub numbers it, and the earlier rounds follow.
"""
import argparse
import json
import sys
from collections import Counter

SCORES = ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--manifest')
    ap.add_argument('--since', default='')
    a = ap.parse_args()
    with open(a.file, encoding='utf-8') as fh:
        D = json.load(fh)
    M = {}
    if a.manifest:
        with open(a.manifest, encoding='utf-8') as fh:
            M = json.load(fh)
    items = D.get('items', {})
    names = D.get('names', {})
    order, title, num, words, out = [], {}, {}, {}, set()
    # numbered as the hub numbers them: this round first, then by group, in the order the groups are
    # listed, then as written
    gpos = {g.get('id'): i for i, g in enumerate(M.get('groups', []))}
    rnd = M.get('round') or {}
    r_ids, r_groups = set(rnd.get('ids') or []), set(rnd.get('groups') or [])
    if not r_ids and not r_groups:
        r_ids = set((M.get('ask') or {}).get('ids') or [])
    iid_of = lambda it: it.get('id') or it['href'].rsplit('.', 1)[0]
    now = {iid_of(it) for it in M.get('items', []) if iid_of(it) in r_ids or it.get('group') in r_groups}
    if not now:
        now = {iid_of(it) for it in M.get('items', [])}
    ranked = sorted(enumerate(M.get('items', [])), key=lambda p: (iid_of(p[1]) not in now, gpos.get(p[1].get('group'), 10 ** 6), p[0]))
    for i, (_, it) in enumerate(ranked, 1):
        iid = it.get('id') or it['href'].rsplit('.', 1)[0]
        order.append(iid)
        num[iid] = i
        t = it.get('title')
        title[iid] = t.get('en') if isinstance(t, dict) else t
        if it.get('out'):
            out.add(iid)
    for g in M.get('tags', []) + M.get('phrases', []):
        words[g['id']] = g.get('en', g['id'])
    earlier = [k for k in items if k not in num]

    def score(it):
        s = it.get('stars') or 0
        if s:
            return f'{s} {SCORES[s]}'
        return {'good': 'Good (no score)', 'bad': 'Not for me (no score)'}.get(it.get('verdict'), 'not scored')

    def marks(it):
        out = []
        for p in it.get('pins') or []:
            out.append({'kind': None, 'text': p.get('text', ''), 'near': p.get('view', ''), 'when': p.get('when', ''),
                        'at': p.get('at'), 'old': True, 'tags': [], 'phrases': [], 'done': False})
        for m in it.get('marks') or []:
            if m.get('gone'):
                continue
            out.append(dict(m, near=(m.get('where') or {}).get('near', '')))
        return [m for m in out if not a.since or str(m.get('when', '')) >= a.since]

    open_marks = []
    keeps = Counter()
    lines = [f"{M.get('title', {}).get('en', D.get('name', a.file)) if M else a.file}  (saved {D.get('_saved', '?')})", '']
    # the versions this round asks him to score (manifest "ask"), and which still wait
    ask = [x for x in (M.get('ask') or {}).get('ids', []) if x in num]
    if ask:
        left = [x for x in ask if not (items.get(x, {}).get('stars') or items.get(x, {}).get('verdict'))]
        lines.append(f"Asked this round (Your pick): {len(ask) - len(left)} of {len(ask)} scored")
        lines += [f"    {num[x]:>2} {title.get(x) or x}: {score(items.get(x, {}))}" for x in ask]
        lines.append('')
    split = len(now) < len(order)
    for iid in order + earlier:
        if split and iid == order[0]:
            lines += [f"This round ({len(now)})", '']
        if split and iid not in now and (iid in earlier and iid == earlier[0] and not [x for x in order if x not in now] or iid in order and iid == [x for x in order if x not in now][0]):
            lines += [f"Earlier rounds ({len(order) - len(now)} on the list)", '']
        it = items.get(iid, {})
        ms = marks(it)
        head = f"{num.get(iid, '-'):>2}  {title.get(iid) or names.get(iid, iid)}  [{iid}]"
        if iid in earlier:
            head += '  (removed from the list)'
        elif iid in out:
            head += '  (not using: crossed out on the list)'
        lines.append(head)
        # the hub's rule: a score, a note, a pin or a mark means he has seen it, dated or not
        if it.get('seen'):
            seen = it['seen']
        elif it.get('stars') or it.get('verdict') or it.get('note') or it.get('pins') or it.get('marks'):
            seen = 'yes (before the kit kept a date)'
        else:
            seen = 'no'
        lines.append(f"    score: {score(it)};  seen: {seen}")
        if it.get('note'):
            lines.append(f"    overall: {it['note'].strip()}")
        if it.get('beats'):
            lines.append('    kept over: ' + ', '.join(f"{num.get(b, '')} {title.get(b, b)}".strip() for b in it['beats']))
        for i, m in enumerate(ms, 1):
            kind = {'like': 'LIKE', 'change': 'CHANGE'}.get(m.get('kind'), 'old note' if m.get('old') else 'mark')
            bits = [words.get(x, x) for x in (m.get('tags') or [])] + [words.get(x, x) for x in (m.get('phrases') or [])]
            where = f" near \"{m['near']}\"" if m.get('near') else ''
            if m.get('old') and m.get('at') is not None:
                where += f" at {round(m['at'] * 100)}% down"
            lines.append(f"    {i}. {kind}{(': ' + ', '.join(bits)) if bits else ''}{(' / ' + m['text']) if m.get('text') else ''}{where}"
                         f"{'  (done)' if m.get('done') else ''}")
            for p in m.get('phrases') or []:
                for g in (m.get('tags') or ['']):
                    keeps[(m.get('kind') or '', words.get(p, p), words.get(g, g))] += 1
            if not (m.get('phrases') or []):
                for g in m.get('tags') or []:
                    keeps[(m.get('kind') or '', '', words.get(g, g))] += 1
            if not m.get('done') and not m.get('old'):
                open_marks.append(f"{num.get(iid, '-')}.{i} {title.get(iid) or iid}: {kind} {', '.join(bits)} {m.get('text', '')}".strip())
        lines.append('')
    if D.get('groupNotes'):
        lines.append('Group notes:')
        for g, t in D['groupNotes'].items():
            if t:
                lines.append(f'    {g}: {t}')
        lines.append('')
    if D.get('general'):
        lines.append(f"Anything else: {D['general']}")
        lines.append('')
    lines.append('Keeps saying:')
    for (kind, p, g), n in keeps.most_common():
        lines.append(f"    {kind or '-'}: {p or g} x{n}{(' on ' + g) if p and g else ''}")
    if not keeps:
        lines.append('    nothing yet')
    lines.append('')
    lines.append(f'Marks not done yet: {len(open_marks)}')
    lines += ['    ' + x for x in open_marks]
    print('\n'.join(lines))
    return 0


if __name__ == '__main__':
    sys.exit(main())
