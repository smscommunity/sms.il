"""Bring public/wr-history.json up to date with a freshly downloaded IL sheet.

Run by the Build & Deploy workflow every 30 minutes:

    python3 scripts/wr_history/update.py --sheet data/ilsheet.xlsx --previous deployed.xlsx \
        --history public/wr-history.json --github-output "$GITHUB_OUTPUT"

--previous is the sheet the live site was last built from. It's used to tell whether the
leaderboard changed at all (sheet_changed) and to spot players who renamed themselves, so the
history keeps showing everyone under their latest name. It can be missing; then the build always
runs and renames are picked up next time.

Exits non-zero if the new sheet can't be read (e.g. Google returned an error page), so a bad
download never reaches the site. Python 3.8+, standard library only.
"""
import argparse
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from history import best, detect_renames, event_state, make_event, mark_reverted, players_by_name, same  # noqa: E402
from ilsheet import fingerprint, parse_snapshot  # noqa: E402

MIN_LEVELS = 50  # anything less means we didn't get the real ILs tab


def apply_renames(history, renames):
    """Rewrite every past mention of a renamed player to their new name."""
    if not renames:
        return False
    mapping = dict(renames)
    for entry in history['levels'].values():
        for mode in ('history', 'historyVideo'):
            for ev in entry[mode]:
                seen, players = set(), []
                for p in ev['players']:
                    name = mapping.get(p['name'], p['name'])
                    if name not in seen:
                        seen.add(name)
                        players.append({'name': name, 'link': p['link']})
                ev['players'] = sorted(players, key=lambda p: (p['name'], p['link'] or ''))
                for field in ('added', 'dropped'):
                    if field in ev:
                        ev[field] = sorted({mapping.get(n, n) for n in ev[field]})
    return True


def update(history, levels, runs, today, prev_runs=None, renames=()):
    """Append events for every level whose WR changed. Returns True if anything changed."""
    mapping = dict(renames)
    changed = False
    for key, meta in levels.items():
        entry = history['levels'].get(key)
        if entry is None:
            entry = {k: meta[k] for k in ('world', 'episode', 'subCategory', 'isReverse')}
            entry['history'], entry['historyVideo'] = [], []
            history['levels'][key] = entry
            changed = True
        if entry.pop('retired', None):
            changed = True
        for mode, video_only in (('history', False), ('historyVideo', True)):
            events = entry[mode]
            cur = best([r for r in runs[key] if r[2] or not video_only], meta['isReverse'])
            prev = event_state(events[-1]) if events else None
            if prev_runs is not None and key in prev_runs:
                # The previous sheet has the same WR but with its latest video links (a video can be
                # swapped without the time changing); that's what decides wr vs retime.
                rs = [(t, mapping.get(n, n), l) for t, n, l in prev_runs[key] if l or not video_only]
                fresher = best(rs, meta['isReverse'])
                if same(fresher, prev):
                    prev = fresher
            if same(prev, cur):
                continue
            events.append(make_event(today, prev, cur, meta['isReverse']))
            mark_reverted(events)
            changed = True
    for key, entry in history['levels'].items():
        if key not in levels and 'retired' not in entry:
            entry['retired'] = today
            changed = True
    return changed


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--sheet', required=True, help='freshly downloaded ilsheet.xlsx')
    ap.add_argument('--previous', help='the sheet the live site was built from (optional)')
    ap.add_argument('--history', default='public/wr-history.json')
    ap.add_argument('--date', help='date for new events, YYYY-MM-DD (default: today, UTC)')
    ap.add_argument('--github-output', help='append sheet_changed/history_changed here')
    args = ap.parse_args()
    today = args.date or datetime.datetime.now(datetime.timezone.utc).date().isoformat()

    data = open(args.sheet, 'rb').read()
    try:
        levels, runs, _ = parse_snapshot(data)
    except Exception as e:
        sys.exit(f'Could not read {args.sheet}: {e}')
    if len(levels) < MIN_LEVELS:
        sys.exit(f'{args.sheet} only has {len(levels)} levels; refusing to use it')

    prev_runs, sheet_changed = None, True
    if args.previous and os.path.exists(args.previous):
        try:
            prev_data = open(args.previous, 'rb').read()
            prev_runs = parse_snapshot(prev_data)[1]
            sheet_changed = fingerprint(prev_data) != fingerprint(data)
        except Exception as e:
            print(f'Ignoring unreadable previous sheet: {e}', file=sys.stderr)

    with open(args.history, encoding='utf-8') as f:
        history = json.load(f)
    renames = detect_renames(players_by_name(prev_runs), players_by_name(runs)) if prev_runs else []
    for old, new in renames:
        print(f'rename: {old} -> {new}', file=sys.stderr)
    history_changed = apply_renames(history, renames)
    history_changed = update(history, levels, runs, today, prev_runs, renames) or history_changed

    if history_changed:
        history['to'] = today
        history['generated'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        with open(args.history, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=1)
            f.write('\n')
    print(f'sheet_changed={str(sheet_changed).lower()} history_changed={str(history_changed).lower()}',
          file=sys.stderr)
    if args.github_output:
        with open(args.github_output, 'a') as f:
            f.write(f'sheet_changed={str(sheet_changed).lower()}\n')
            f.write(f'history_changed={str(history_changed).lower()}\n')


if __name__ == '__main__':
    main()
