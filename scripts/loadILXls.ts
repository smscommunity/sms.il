import xlsx, { CellObject, Sheet2JSONOpts, WorkSheet, Range as SheetJsRange } from 'xlsx';
import path from 'path';
import PlayerData from '../types/PlayerData';
import LevelData from '../types/LevelData';
import ILData from '../types/ILData';

interface RawSheetData {
    time: string;
    link: string;
    comment: string;
}

interface LoadedData {
    levelData: (LevelData | null)[];
    playerData: PlayerData[];
    ilData: ILData[][];
    playerToIlMap: Map<string, ILData[]>;
}

let cachedReadData: LoadedData | undefined = undefined;

export default function (): LoadedData {
    if (!!cachedReadData) {
        return cachedReadData;
    }

    const worksheets = xlsx.readFile(path.resolve('./data', 'ilsheet.xlsx'));

    const ilSheet = worksheets.Sheets['ILs'];

    const rowObjects = xlsx.utils.sheet_to_json<string[]>(ilSheet, { header: 1, blankrows: true });

    const levelData = buildHeadersFromRowObjects(rowObjects);

    const sheetJson = sheet_to_json(ilSheet, { header: 1, range: 4 });

    const playerData: PlayerData[] = [];
    const playerToIlMap: Map<string, ILData[]> = new Map<string, ILData[]>();
    const unsortedData: Omit<ILData, 'rank' | 'pointValue'>[][] = new Array(levelData.length + 7);
    // Index 0: Name
    // Index 1: Points
    // Index 2-4: Medals
    // Index 5-6: Entries + Videos
    // Index 7 -> End: ILs
    let playerRank = 0;
    let playerSkip = 0;
    sheetJson.forEach((element: RawSheetData[], rowIndex) => {
        const playerName = element[0]?.time;
        if (!!playerName) {
            if (rowIndex > 0 && sheetJson[rowIndex - 1][1].time == element[1].time) {
                playerSkip++;
            } else {
                playerRank = playerRank + playerSkip + 1;
                playerSkip = 0;
            }
            const playerEntry = {
                name: playerName,
                rank: playerRank,
                points: parseInt(element[1].time),
                medals: {
                    gold: parseInt(element[2].time),
                    silver: parseInt(element[3].time),
                    bronze: parseInt(element[4].time),
                },
                submissions: parseInt(element[5].time),
                comment: element[0].comment ?? null,
            };
            playerData.push(playerEntry);
            const ils = element.slice(7);
            ils.forEach((submission, index) => {
                if (!!submission && !!submission.time) {
                    const newData: Omit<ILData, 'rank' | 'pointValue'> = {
                        ilData: levelData[index]!,
                        playerData: playerEntry,
                        time: parseTime(submission.time),
                        link: submission.link ?? null,
                        comment: submission.comment ?? null,
                    };
                    if (!!unsortedData[index]) {
                        unsortedData[index].push(newData);
                    } else {
                        unsortedData[index] = [newData];
                    }
                }
            });
        }
    });

    const ilData: ILData[][] = unsortedData.map((ilList, index) => {
        const selectedILData = levelData[index];
        ilList.sort((a, b) => (selectedILData!.isReverse ? b.time - a.time : a.time - b.time));
        let rank = 0;
        let skip = 0;
        // there's probably a better way to do this without iterating twice
        // but this is technically O(n) so eat me.
        let rankedList: Omit<ILData, 'pointValue'>[] = ilList.map((value, index) => {
            if (index > 0 && ilList[index - 1].time == value.time) {
                skip++;
            } else {
                rank = rank + skip + 1;
                skip = 0;
            }
            const newData = {
                ...value,
                rank,
            };
            return newData;
        });

        let points = 0;
        skip = 0;
        rankedList.reverse();
        return rankedList
            .map((val, index) => {
                if (index > 0 && val.time == rankedList[index - 1].time) {
                    skip++;
                } else {
                    points = points + skip + 1;
                    skip = 0;
                }
                const newData = {
                    ...val,
                    pointValue: points,
                };

                if (playerToIlMap.has(newData.playerData.name)) {
                    playerToIlMap.get(newData.playerData.name)?.push(newData);
                } else {
                    playerToIlMap.set(newData.playerData.name, [newData]);
                }

                return newData;
            })
            .reverse();
    });

    cachedReadData = {
        levelData,
        playerData,
        ilData,
        playerToIlMap,
    };

    return cachedReadData;
}

function parseTime(time: string): number {
    const colonSplit = time.toString().split(':');
    const minutes = colonSplit.length > 1 ? parseInt(colonSplit[0]) : 0;
    const dotSplit = colonSplit[colonSplit.length > 1 ? 1 : 0].split('.');
    const hundreths = dotSplit.length > 1 ? parseInt(dotSplit[1]) : 0;
    const seconds = parseInt(dotSplit[0]);
    return hundreths * 10 + seconds * 1000 + minutes * 60 * 1000;
}

function buildHeadersFromRowObjects(rowObjects: (string | undefined)[][]): (LevelData | null)[] {
    const primaryHeaders = rowObjects[0];
    const secondaryHeaders = rowObjects[1];
    const specificHeaders = rowObjects[2];
    let i = 0;
    let primaryHeader: string = '',
        secondaryHeader: string = '';
    const headers = [];
    while (i < secondaryHeaders.length) {
        if (!primaryHeaders[i] && !secondaryHeaders[i] && !specificHeaders[i]) {
            headers.push(null);
            i++;
            continue;
        }
        primaryHeader = primaryHeaders[i] ?? primaryHeader;
        secondaryHeader = secondaryHeaders[i] ?? secondaryHeader;
        const levelData = {
            world: primaryHeader.replace(/[\n\r]/g, ''),
            episode: secondaryHeader.replace(/[\n\r]/g, ''),
            subCategory: specificHeaders[i]?.replace(/[\n\r]/g, '') ?? null,
            id: i,
        };
        headers.push({
            ...levelData,
            isReverse: isReverse(levelData),
        });
        i++;
    }
    return headers.slice(7);
}

// Keep me in sync with https://github.com/pyorot/il-scripts/blob/master/Reverse.js#L13
function isReverse(levelData: LevelData) {
    switch (levelData.world) {
        case 'Bianco Hills':
            return ['Ep. 3 Reds', 'Ep. 6 Reds'].includes(levelData.episode);
        case 'Ricco Harbor':
            return ['Ep. 6', 'Ep. 4 Reds'].includes(levelData.episode);
        case 'Gelato Beach / Mamma Beach':
            return levelData.episode === 'Ep. 1 Reds';
        case 'Pinna Park':
            return ['Ep. 2 Reds', 'Ep. 6 Reds'].includes(levelData.episode);
        case 'Sirena Beach':
            return ['Ep. 6', 'Ep. 8', 'Ep. 2 Reds', 'Ep. 4 Reds'].includes(levelData.episode);
        case 'Noki Bay / Mare Bay':
            return levelData.episode === 'Ep. 6 Reds';
        case 'Pianta Village / Monte Village':
            return ['Ep. 6', 'Ep. 5 Reds'].includes(levelData.episode);
        case 'Delfino Plaza':
            return (
                levelData.episode === 'Airstrip Reds' ||
                levelData.episode.slice(0, 8) === 'Box Game'
            );
    }
}

// This entire codeblock is lifted directly from the sheetjs library.
// We are monkeypatching a specific block to instead give us the rich data we so desire.
function make_json_row(
    sheet: WorkSheet,
    r: SheetJsRange,
    R: number,
    cols: string[],
    header: number,
    hdr: any[],
    dense: boolean,
    o: Sheet2JSONOpts
): any {
    var rr = xlsx.utils.encode_row(R);
    var defval = o.defval,
        raw = o.raw || !Object.prototype.hasOwnProperty.call(o, 'raw');
    var isempty = true;
    var row: any = header === 1 ? [] : {};
    if (header !== 1) {
        if (Object.defineProperty)
            try {
                Object.defineProperty(row, '__rowNum__', { value: R, enumerable: false });
            } catch (e) {
                row.__rowNum__ = R;
            }
        else row.__rowNum__ = R;
    }
    if (!dense || sheet[R])
        for (var C = r.s.c; C <= r.e.c; ++C) {
            var val = dense ? sheet[R][C] : sheet[cols[C] + rr];
            if (val === undefined || val.t === undefined) {
                if (defval === undefined) continue;
                if (hdr[C] != null) {
                    row[hdr[C]] = defval;
                }
                continue;
            }
            // Our monkeypatch is here.
            var v = {
                time: val.v,
                link:
                    val.l?.Target ??
                    (val.f?.indexOf('HYPERLINK("') == 0
                        ? val.f.split('"')[1] ?? undefined
                        : undefined),
                comment: val.c?.[0].t,
            };
            if (hdr[C] != null) {
                if (v == null) {
                    if (defval !== undefined) row[hdr[C]] = defval;
                    else if (raw && v === null) row[hdr[C]] = null;
                    else continue;
                } else {
                    row[hdr[C]] = v;
                }
                if (v != null) isempty = false;
            }
        }
    return { row: row, isempty: isempty };
}

function sheet_to_json(sheet: WorkSheet, opts?: Sheet2JSONOpts) {
    if (sheet == null || sheet['!ref'] == null) return [];
    var val: CellObject = { t: 'n', v: 0 },
        header = 0,
        offset = 1,
        hdr /*:Array<any>*/ = [],
        v: string | number = 0,
        vv = '';
    var r = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    var o = opts || {};
    var range = o.range != null ? o.range : sheet['!ref'];
    if (o.header === 1) header = 1;
    else if (o.header === 'A') header = 2;
    else if (Array.isArray(o.header)) header = 3;
    else if (o.header == null) header = 0;
    switch (typeof range) {
        case 'string':
            r = safe_decode_range(range);
            break;
        case 'number':
            r = safe_decode_range(sheet['!ref']);
            r.s.r = range;
            break;
        default:
            r = range;
    }
    if (header > 0) offset = 0;
    var rr = xlsx.utils.encode_row(r.s.r);
    var cols /*:Array<string>*/ = [];
    var out /*:Array<any>*/ = [];
    var outi = 0,
        counter = 0;
    var dense = Array.isArray(sheet);
    var R = r.s.r,
        C = 0,
        CC = 0;
    if (dense && !sheet[R]) sheet[R] = [];
    for (C = r.s.c; C <= r.e.c; ++C) {
        cols[C] = xlsx.utils.encode_col(C);
        val = dense ? sheet[R][C] : sheet[cols[C] + rr];
        switch (header) {
            case 1:
                hdr[C] = C - r.s.c;
                break;
            case 2:
                hdr[C] = cols[C];
                break;
            case 3:
                hdr[C] = (o.header as any[])[C - r.s.c];
                break;
            default:
                if (val == null) val = { w: '__EMPTY', t: 's' };
                vv = v = xlsx.utils.format_cell(val, null, o);
                counter = 0;
                for (CC = 0; CC < hdr.length; ++CC) if (hdr[CC] == vv) vv = v + '_' + ++counter;
                hdr[C] = vv;
        }
    }
    for (R = r.s.r + offset; R <= r.e.r; ++R) {
        var row = make_json_row(sheet, r, R, cols, header, hdr, dense, o);
        if (row.isempty === false || (header === 1 ? o.blankrows !== false : !!o.blankrows))
            out[outi++] = row.row;
    }
    out.length = outi;
    return out;
}

function safe_decode_range(range: string) /*:Range*/ {
    var o = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
    var idx = 0,
        i = 0,
        cc = 0;
    var len = range.length;
    for (idx = 0; i < len; ++i) {
        if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
        idx = 26 * idx + cc;
    }
    o.s.c = --idx;

    for (idx = 0; i < len; ++i) {
        if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
        idx = 10 * idx + cc;
    }
    o.s.r = --idx;

    if (i === len || range.charCodeAt(++i) === 58) {
        o.e.c = o.s.c;
        o.e.r = o.s.r;
        return o;
    }

    for (idx = 0; i != len; ++i) {
        if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
        idx = 26 * idx + cc;
    }
    o.e.c = --idx;

    for (idx = 0; i != len; ++i) {
        if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
        idx = 10 * idx + cc;
    }
    o.e.r = --idx;
    return o;
}
