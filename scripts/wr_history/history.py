"""Turn per-day WR states into WR history events (used by backfill.py)."""
import datetime

# Columns that were renamed on the sheet: old key -> current key
ALIASES = {
    'Delfino|Gelato Pipe|': 'Delfino|Beach Pipe|',
    'Delfino|Light- house|': 'Delfino|Light-house|',
}
# Columns whose runs moved to a new key on a given day: (old key, first day of new layout, new key).
# On 2025-08-09 the old Ricco Ep. 2 column became "Inside Only" and a new full-level column started.
MOVES = [
    ('Ricco|Ep. 2|', '2025-08-09', 'Ricco|Ep. 2|Inside Only'),
]
REVERT_WINDOW_DAYS = 14


def names(state):
    return tuple(sorted(h[0] for h in state[1])) if state else ()


def same(a, b):
    if a is None or b is None:
        return a is b
    return a[0] == b[0] and names(a) == names(b)


def better(a, b, reverse):
    return a > b if reverse else a < b


def classify(prev, cur, reverse):
    """Return (type, added, dropped) for a change from prev -> cur WR state."""
    pn, cn = set(names(prev)), set(names(cur))
    added, dropped = sorted(cn - pn), sorted(pn - cn)
    if cur is None:
        return 'cleared', [], sorted(pn)
    if prev is None:
        return 'wr', sorted(cn), []
    if cur[0] == prev[0]:
        if added and not dropped:
            return 'tie', added, []
        if dropped and not added:
            return 'tieRemoved', [], dropped
        return 'credit', added, dropped  # same run credited to someone else
    prev_links = {h[1] for h in prev[1]}
    if better(cur[0], prev[0], reverse):
        # Same holders and same video: the run was retimed, not beaten.
        if not added and not dropped and all(h[1] in prev_links for h in cur[1]):
            return 'retime', [], []
        return 'wr', sorted(cn) if not added else added, dropped
    # Time got worse. If every holder is still there, their run was retimed (maybe into a tie).
    if not dropped:
        return 'retime', added, []
    return 'removed', added, dropped


def build(seq, reverse, start_day):
    """seq: [(day, state)] in date order. Returns the event list."""
    events = []
    prev = None
    for i, (day, cur) in enumerate(seq):
        if i == 0 and day == start_day:
            if cur is not None:
                events.append({'date': day, 'type': 'initial', 'time': cur[0],
                               'players': cur[1], '_before': None, '_after': cur})
            prev = cur
            continue
        if same(prev, cur):
            prev = cur  # keep newest links
            continue
        events.append(make_event(day, prev, cur, reverse))
        prev = cur

    for ev in events:
        ev.pop('_before', None)
        ev.pop('_after', None)
        if ev['players'] and not isinstance(ev['players'][0], dict):
            ev['players'] = [{'name': n, 'link': l} for n, l in ev['players']]
    mark_reverted(events)
    return events


def make_event(day, prev, cur, reverse):
    """A new history event for the change prev -> cur (states are [time, [[name, link], ...]] or None)."""
    typ, added, dropped = classify(prev, cur, reverse)
    ev = {'date': day, 'type': typ, 'time': cur[0] if cur else None,
          'players': [{'name': n, 'link': l} for n, l in cur[1]] if cur else []}
    if added and typ != 'wr':
        ev['added'] = added
    if dropped:
        ev['dropped'] = dropped
    return ev


def event_state(ev):
    """The WR state an event left behind, in the same shape as a parsed state."""
    if ev is None or ev['time'] is None:
        return None
    return [ev['time'], [[p['name'], p['link']] for p in ev['players']]]


def mark_reverted(events):
    """Mark short-lived changes that were undone within the window (typos, removed runs) as reverted."""
    def d(s):
        return datetime.date.fromisoformat(s)
    for j, ev in enumerate(events):
        if ev['type'] == 'initial' or ev.get('reverted'):
            continue
        before = event_state(events[j - 1]) if j > 0 else None
        for k in range(j, len(events)):
            if (d(events[k]['date']) - d(ev['date'])).days > REVERT_WINDOW_DAYS:
                break
            if same(event_state(events[k]), before):
                for m in range(j, k + 1):
                    events[m]['reverted'] = True
                break


def best(runs, reverse):
    """WR state for one level: [time, [[name, link], ...]] for everyone on the best time, or None."""
    if not runs:
        return None
    t = max(r[0] for r in runs) if reverse else min(r[0] for r in runs)
    holders = sorted({(n, l) for tm, n, l in runs if tm == t})
    return [t, [[n, l] for n, l in holders]]


def players_by_name(runs):
    """{player: {(level key, time), ...}} for rename detection."""
    players = {}
    for key, rs in runs.items():
        for t, n, _ in rs:
            players.setdefault(n, set()).add((key, t))
    return players


def detect_renames(prev_players, players):
    """[(old, new)] for names that vanished while a new name appeared with (nearly) the same runs."""
    new = [n for n in players if n not in prev_players]
    matched, out = set(), []
    for gone in (n for n in prev_players if n not in players):
        old = prev_players[gone]
        best_n, best_score = None, 0.0
        for n in new:
            if n in matched:
                continue
            score = len(old & players[n]) / max(len(old), len(players[n]))
            if score > best_score:
                best_n, best_score = n, score
        # exact match, or a big overlap (renamed and updated a time the same day)
        if best_n and (best_score == 1.0 or (best_score >= 0.8 and len(old) >= 3)):
            matched.add(best_n)
            out.append((gone, best_n))
    return out


def make_renamer(renames):
    """Map a name seen on `day` to that player's latest name (follows chains like Dex -> LadDex -> Dex513).

    Keeps anonymised players anonymous across all of history.
    """
    renames = sorted(renames)  # [day, old, new, ...]

    def resolve(name, day):
        for rday, old, new, *_ in renames:
            if rday > day and old == name:
                name = new
        return name
    return resolve


def rename_state(state, day, resolve):
    if state is None:
        return None
    holders = sorted({(resolve(n, day), l) for n, l in state[1]})
    # One player can't hold a WR twice; keep a single entry per name.
    seen, out = set(), []
    for n, l in holders:
        if n not in seen:
            seen.add(n)
            out.append([n, l])
    return [state[0], out]
