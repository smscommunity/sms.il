"""Parse the ILs tab of an ilsheet.xlsx snapshot the same way scripts/loadILXls.ts does.

Reads the xlsx XML directly (stdlib only) so thousands of snapshots can be parsed quickly.
"""
import hashlib
import io
import json
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET

MAIN = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PKG = '{http://schemas.openxmlformats.org/package/2006/relationships}'

# Keep in sync with WORLD_SHORT_NAMES / SUB_CATEGORY_SHORT_NAMES in scripts/loadILXls.ts
WORLD_SHORT_NAMES = {
    'Bianco Hills': 'Bianco',
    'Ricco Harbor': 'Ricco',
    'Gelato Beach / Mamma Beach': 'Gelato',
    'Pinna Park': 'Pinna',
    'Sirena Beach': 'Sirena',
    'Noki Bay / Mare Bay': 'Noki',
    'Pianta Village / Monte Village': 'Pianta',
    'Delfino Plaza': 'Delfino',
}
SUB_CATEGORY_SHORT_NAMES = {'Full Level': None, 'Secret Only': 'Secret'}

# Keep in sync with isReverse() in scripts/loadILXls.ts
REVERSE = {
    'Bianco Hills': ['Ep. 3 Reds', 'Ep. 6 Reds'],
    'Ricco Harbor': ['Ep. 6', 'Ep. 4 Reds'],
    'Gelato Beach / Mamma Beach': ['Ep. 1 Reds'],
    'Pinna Park': ['Ep. 2 Reds', 'Ep. 6 Reds'],
    'Sirena Beach': ['Ep. 6', 'Ep. 8', 'Ep. 2 Reds', 'Ep. 4 Reds'],
    'Noki Bay / Mare Bay': ['Ep. 6 Reds'],
    'Pianta Village / Monte Village': ['Ep. 6', 'Ep. 5 Reds'],
    'Delfino Plaza': ['Airstrip Reds'],
}

TIME_RE = re.compile(r'^(?:(\d+):)?(\d+)(?:\.(\d+))?$')
HYPERLINK_RE = re.compile(r'HYPERLINK\(\s*"([^"]+)"', re.I)
REF_RE = re.compile(r'^([A-Z]+)(\d+)$')


def is_reverse(raw_world, episode):
    if raw_world == 'Delfino Plaza' and episode.startswith('Box Game'):
        return True
    return episode in REVERSE.get(raw_world, [])


TYPO_RE = re.compile(r'^(\d+):(\d{2}):(\d{2})$')  # "1:41:48" typed for "1:41.48"


def parse_time(text):
    """Milliseconds, truncated to hundredths like parseTime() in loadILXls.ts. None if not a time."""
    text = text.strip()
    typo = TYPO_RE.match(text)
    if typo:
        text = f'{typo.group(1)}:{typo.group(2)}.{typo.group(3)}'
    m = TIME_RE.match(text)
    if not m:
        return None
    minutes = int(m.group(1) or 0)
    seconds = int(m.group(2))
    frac = (m.group(3) or '')[:2].ljust(2, '0')
    return minutes * 60000 + seconds * 1000 + int(frac) * 10


def col_index(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def _clean(s):
    return re.sub(r'[\n\r]', '', s) if s is not None else None


def _shared_strings(z):
    if 'xl/sharedStrings.xml' not in z.namelist():
        return []
    out = []
    for _, el in ET.iterparse(z.open('xl/sharedStrings.xml')):
        if el.tag == MAIN + 'si':
            parts = []
            for child in el:
                if child.tag == MAIN + 't':
                    parts.append(child.text or '')
                elif child.tag == MAIN + 'r':
                    t = child.find(MAIN + 't')
                    parts.append(t.text or '' if t is not None else '')
            out.append(''.join(parts))
            el.clear()
    return out


def _sheet_path(z, name):
    wb = ET.parse(z.open('xl/workbook.xml')).getroot()
    rid = None
    for sh in wb.iter(MAIN + 'sheet'):
        if sh.get('name') == name:
            rid = sh.get(REL + 'id')
    if rid is None:
        return None
    rels = ET.parse(z.open('xl/_rels/workbook.xml.rels')).getroot()
    for r in rels.iter(PKG + 'Relationship'):
        if r.get('Id') == rid:
            target = r.get('Target').lstrip('/')
            return target if target.startswith('xl/') else 'xl/' + target
    return None


def read_sheet(data, name='ILs'):
    """Return {(row, col): (text, link)} for one tab (0-indexed rows/cols)."""
    z = zipfile.ZipFile(io.BytesIO(data))
    path = _sheet_path(z, name)
    if path is None:
        raise ValueError(f'no "{name}" tab')
    strings = _shared_strings(z)
    rels_path = path.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    link_targets = {}
    if rels_path in z.namelist():
        for r in ET.parse(z.open(rels_path)).getroot().iter(PKG + 'Relationship'):
            link_targets[r.get('Id')] = r.get('Target')

    cells = {}
    cell_links = {}
    for _, el in ET.iterparse(z.open(path)):
        tag = el.tag
        if tag == MAIN + 'c':
            m = REF_RE.match(el.get('r'))
            row, col = int(m.group(2)) - 1, col_index(m.group(1))
            t = el.get('t')
            v = el.find(MAIN + 'v')
            f = el.find(MAIN + 'f')
            text = None
            if t == 's' and v is not None:
                text = strings[int(v.text)]
            elif t == 'inlineStr':
                is_ = el.find(MAIN + 'is')
                text = ''.join(x.text or '' for x in is_.iter(MAIN + 't')) if is_ is not None else None
            elif v is not None and v.text is not None:
                text = v.text
                if t in (None, 'n'):
                    num = float(text)
                    text = str(int(num)) if num.is_integer() else repr(num)
            link = None
            if f is not None and f.text:
                hm = HYPERLINK_RE.search(f.text)
                if hm:
                    link = hm.group(1)
            if text is not None or link is not None:
                cells[(row, col)] = [text, link]
            el.clear()
        elif tag == MAIN + 'hyperlink':
            target = link_targets.get(el.get(REL + 'id'))
            if target:
                cell_links[el.get('ref').split(':')[0]] = target
        elif tag == MAIN + 'row':
            el.clear()
    for ref, target in cell_links.items():
        m = REF_RE.match(ref)
        key = (int(m.group(2)) - 1, col_index(m.group(1)))
        if key in cells:
            # A real cell hyperlink wins over a HYPERLINK() formula, same as `l?.Target ?? f` in the site.
            cells[key][1] = target
    return cells


def _comments(z, sheet_path):
    """{cell ref: comment text} for a sheet, via its comments relationship."""
    rels_path = sheet_path.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    if rels_path not in z.namelist():
        return {}
    out = {}
    for r in ET.parse(z.open(rels_path)).getroot().iter(PKG + 'Relationship'):
        if not r.get('Type', '').endswith('/comments'):
            continue
        target = r.get('Target')
        if target.startswith('/'):
            target = target.lstrip('/')
        else:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(sheet_path), target))
        if target not in z.namelist():
            continue
        for c in ET.parse(z.open(target)).getroot().iter(MAIN + 'comment'):
            out[c.get('ref')] = ''.join(t.text or '' for t in c.iter(MAIN + 't'))
    return out


def fingerprint(data):
    """Hash of what the site reads from the ILs tab (values, links, comments).

    Google's export reshuffles styles and other tabs on every download, so the file bytes change even
    when nothing on the leaderboard did; this only changes when the leaderboard does.
    """
    cells = read_sheet(data)
    z = zipfile.ZipFile(io.BytesIO(data))
    comments = _comments(z, _sheet_path(z, 'ILs'))
    payload = json.dumps([sorted((r, c, v[0], v[1]) for (r, c), v in cells.items()),
                          sorted(comments.items())], ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def parse_snapshot(data):
    """Parse one snapshot into levels + runs.

    Returns (levels, runs, skipped) where
      levels: {key: {world, episode, subCategory, isReverse}}
      runs:   {key: [(time_ms, player, link_or_None)]}
      skipped: list of (player, key, raw_text) cells that weren't valid times
    """
    cells = read_sheet(data)
    max_col = max(c for _, c in cells) if cells else 0

    def text(r, c):
        v = cells.get((r, c))
        return v[0] if v else None

    # Header rows 1-3, columns H onward. World/episode carry right across merged cells.
    columns = {}
    world = episode = ''
    for c in range(max_col + 1):
        p, s, sp = text(0, c), text(1, c), text(2, c)
        if not p and not s and not sp:
            continue
        world = p if p is not None else world
        episode = s if s is not None else episode
        if c < 7:
            continue
        raw_world = _clean(world)
        ep = _clean(episode)
        raw_sub = _clean(sp)
        sub = SUB_CATEGORY_SHORT_NAMES[raw_sub] if raw_sub in SUB_CATEGORY_SHORT_NAMES else raw_sub
        short_world = WORLD_SHORT_NAMES.get(raw_world, raw_world)
        key = f'{short_world}|{ep}|{sub or ""}'
        if key in columns.values():  # two columns with identical headers; keep them apart
            key = f'{key}#{c}'
        columns[c] = key
    levels = {}
    for c, key in columns.items():
        short_world, ep, sub = key.split('|')
        raw_world = next((k for k, v in WORLD_SHORT_NAMES.items() if v == short_world), short_world)
        levels[key] = {
            'world': short_world,
            'episode': ep,
            'subCategory': sub or None,
            'isReverse': is_reverse(raw_world, ep),
        }

    # Player rows: a name in column A and a numeric points total in column B.
    max_row = max(r for r, _ in cells) if cells else 0
    runs = {k: [] for k in levels}
    skipped = []
    for r in range(3, max_row + 1):
        name = text(r, 0)
        pts = text(r, 1)
        if not name or pts is None:
            continue
        try:
            float(pts)
        except ValueError:
            continue
        for c, key in columns.items():
            cell = cells.get((r, c))
            if not cell or cell[0] is None or str(cell[0]).strip() == '':
                continue
            t = parse_time(str(cell[0]))
            if t is None:
                skipped.append((name, key, cell[0]))
                continue
            runs[key].append((t, name.strip(), cell[1]))
    return levels, runs, skipped
