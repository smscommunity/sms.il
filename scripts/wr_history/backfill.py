"""Rebuild IL WR history from the snapshots of data/ilsheet.xlsx kept in this repo's git history.

Run from a clone with full history (not a shallow clone). A blob-less clone works too and is
much smaller to download; missing snapshots are fetched in batches:

    git clone --filter=blob:none --no-checkout https://github.com/smscommunity/sms.il.git sms.il-history
    python3 scripts/wr_history/backfill.py --repo sms.il-history --out public/wr-history.json

Takes about 5 minutes for ~1,800 daily snapshots. Python 3.8+, standard library only.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from history import (  # noqa: E402
    ALIASES, MOVES, best, build, detect_renames, make_renamer, players_by_name, rename_state,
)
from ilsheet import parse_snapshot  # noqa: E402

SHEET_PATH = 'data/ilsheet.xlsx'


def git(repo, *args, **kw):
    return subprocess.run(['git', '-C', repo, *args], check=True, capture_output=True, text=True, **kw).stdout


def daily_snapshots(repo):
    """[(utc_day, commit, blob)] for the last commit of each UTC day that touched the sheet."""
    seen = {}
    for line in git(repo, 'log', '--format=%H %cI', '--', SHEET_PATH).splitlines():
        commit, iso = line.split()
        day = datetime.datetime.fromisoformat(iso).astimezone(datetime.timezone.utc).date().isoformat()
        seen.setdefault(day, commit)  # log is newest first, so the first hit is the day's last commit
    out = []
    for day in sorted(seen):
        tree = git(repo, 'ls-tree', seen[day], SHEET_PATH).split()
        if len(tree) >= 3:
            out.append((day, seen[day], tree[2]))
    return out


def prefetch(repo, blobs, batch=300):
    """In a partial (blob-less) clone, fetch the needed snapshots in a few round trips."""
    missing = [b for b in blobs if subprocess.run(['git', '-C', repo, 'cat-file', '-e', b],
                                                  capture_output=True).returncode != 0]
    for i in range(0, len(missing), batch):
        print(f'fetching snapshots {i + 1}-{min(i + batch, len(missing))} of {len(missing)}', file=sys.stderr)
        git(repo, '-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '-q', '--no-tags',
            '--no-write-fetch-head', '--filter=blob:none', 'origin', *missing[i:i + batch])


def scan(repo, snapshots):
    """Parse every snapshot; return per-day WR states, level metadata and detected player renames."""
    proc = subprocess.Popen(['git', '-C', repo, 'cat-file', '--batch'],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    days, levels_meta, renames, failed = [], {}, [], []
    prev_players = None
    for i, (day, commit, blob) in enumerate(snapshots):
        proc.stdin.write((blob + '\n').encode())
        proc.stdin.flush()
        size = int(proc.stdout.readline().split()[2])
        data = proc.stdout.read(size)
        proc.stdout.read(1)
        try:
            levels, runs, _ = parse_snapshot(data)
        except Exception as e:  # e.g. a failed download that committed an error page
            failed.append((day, commit, str(e)))
            continue
        state = {}
        for key, meta in levels.items():
            levels_meta.setdefault(key, meta)
            rs = runs[key]
            state[key] = {'all': best(rs, meta['isReverse']),
                          'video': best([r for r in rs if r[2]], meta['isReverse'])}
        days.append((day, state))

        players = players_by_name(runs)
        if prev_players is not None:
            renames.extend([day, old, new] for old, new in detect_renames(prev_players, players))
        prev_players = players
        if i % 250 == 0:
            print(f'{day}  ({i + 1}/{len(snapshots)})', file=sys.stderr)
    proc.stdin.close()
    proc.wait()
    return days, levels_meta, renames, failed


def assemble(days, levels_meta, renames):
    start, end = days[0][0], days[-1][0]
    resolve = make_renamer(renames)
    canon_days = []
    for day, raw in days:
        st = dict(raw)
        for old, new in ALIASES.items():
            if old in st:
                st[new] = st.pop(old)
        for old, first_new_day, new in MOVES:
            if day < first_new_day and old in st:
                st[new] = st.pop(old)
        canon_days.append((day, {k: {'all': rename_state(v['all'], day, resolve),
                                     'video': rename_state(v['video'], day, resolve)}
                                 for k, v in st.items()}))
    current = canon_days[-1][1]

    levels = {}
    for key, meta in levels_meta.items():
        if key in ALIASES:
            continue
        seq = [(day, st[key]) for day, st in canon_days if key in st]
        if not seq:  # only ever existed under a key that MOVES maps elsewhere
            continue
        entry = {k: meta[k] for k in ('world', 'episode', 'subCategory', 'isReverse')}
        if key not in current:
            entry['retired'] = seq[-1][0]
        former = [o for o, n in ALIASES.items() if n == key]
        if former:
            entry['formerKeys'] = former
        entry['history'] = build([(d, s['all']) for d, s in seq], meta['isReverse'], start)
        entry['historyVideo'] = build([(d, s['video']) for d, s in seq], meta['isReverse'], start)
        levels[key] = entry

    return {
        'generated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'from': start,
        'to': end,
        'snapshots': len(days),
        'notes': [
            'Built from daily snapshots of data/ilsheet.xlsx in git history (last commit of each UTC day).',
            'date = the day a change first appeared on the IL sheet, not the day the run was played.',
            "type 'initial' = already the WR when tracking began on the 'from' date.",
            'history = best run of any kind; historyVideo = best run with a video (what earns gold on the site).',
            'Other types: wr, tie, tieRemoved, credit (same run credited to another player), retime, '
            'removed (WR run taken off the sheet), cleared (level emptied).',
            'reverted = undone within 14 days (typos, removed runs); hide by default.',
            'Player names are shown as their latest name on the sheet, so renamed and anonymised players stay consistent.',
            "Level keys are 'world|episode|subCategory' using the same short names as LevelData.",
        ],
        'levels': levels,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--repo', default='.', help='clone of sms.il with full history (default: .)')
    ap.add_argument('--out', default='public/wr-history.json')
    args = ap.parse_args()

    if git(args.repo, 'rev-parse', '--is-shallow-repository').strip() == 'true':
        sys.exit('This is a shallow clone; it needs full history. Run: git fetch --unshallow --filter=blob:none')
    snapshots = daily_snapshots(args.repo)
    print(f'{len(snapshots)} daily snapshots, {snapshots[0][0]} to {snapshots[-1][0]}', file=sys.stderr)
    prefetch(args.repo, [b for _, _, b in snapshots])
    days, levels_meta, renames, failed = scan(args.repo, snapshots)
    for day, commit, err in failed:
        print(f'skipped {day} ({commit[:7]}): {err}', file=sys.stderr)
    out = assemble(days, levels_meta, renames)
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'wrote {args.out}: {len(out["levels"])} levels, {len(renames)} player renames applied', file=sys.stderr)


if __name__ == '__main__':
    main()
