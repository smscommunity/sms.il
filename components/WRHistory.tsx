import React from 'react';
import Link from 'next/link';
import LevelData from '../types/LevelData';
import { parseMilisecondsToUserTime } from './ILRow';
import styles from '../styles/WRHistory.module.css';

// Shape of public/wr-history.json (built by scripts/wr_history).
interface HistoryPlayer {
    name: string;
    link: string | null;
}

interface HistoryEvent {
    date: string;
    type: 'initial' | 'wr' | 'tie' | 'tieRemoved' | 'credit' | 'retime' | 'removed' | 'cleared';
    time: number | null;
    players: HistoryPlayer[];
    added?: string[];
    dropped?: string[];
    reverted?: boolean;
}

interface HistoryLevel {
    isReverse: boolean;
    history: HistoryEvent[];
    historyVideo: HistoryEvent[];
}

interface HistoryFile {
    from: string;
    levels: Record<string, HistoryLevel>;
}

// Fetched once, the first time anyone opens a WR history, then reused.
let historyRequest: Promise<HistoryFile> | null = null;

function loadHistory(): Promise<HistoryFile> {
    if (!historyRequest) {
        historyRequest = fetch('/wr-history.json').then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
        // Let the next open try again if this one failed.
        historyRequest.catch(() => {
            historyRequest = null;
        });
    }
    return historyRequest;
}

export function wrHistoryKey(level: LevelData) {
    return level.world + '|' + level.episode + '|' + (level.subCategory ?? '');
}

function formatDate(isoDate: string) {
    return new Date(isoDate + 'T00:00:00Z').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

// Signed difference, e.g. "−0.12" for a faster time or "+0.12" on levels where higher is better.
function formatDifference(ms: number) {
    const sign = ms < 0 ? '−' : '+';
    const abs = Math.abs(ms);
    if (abs >= 60000) return sign + parseMilisecondsToUserTime(abs);
    return sign + (abs / 1000).toFixed(2);
}

const NOTES: Record<HistoryEvent['type'], string> = {
    initial: 'Earliest on record',
    wr: '',
    tie: 'Tied',
    tieRemoved: 'Tied run removed',
    credit: 'Credit corrected',
    retime: 'Retimed',
    removed: 'Previous WR removed',
    cleared: 'No runs',
};

export interface WRHistoryProps {
    level: LevelData;
    title: string;
    videoOnly: boolean;
    // Trimmed name -> name as used in /player/ links, for players still on the leaderboard.
    playerPages: Map<string, string>;
    onClose: () => void;
}

export default function WRHistory(props: WRHistoryProps) {
    const { level, title, videoOnly, playerPages, onClose } = props;
    const [data, setData] = React.useState<HistoryFile | null>(null);
    const [failed, setFailed] = React.useState(false);
    const closeButtonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        let active = true;
        loadHistory()
            .then(file => active && setData(file))
            .catch(() => active && setFailed(true));
        return () => {
            active = false;
        };
    }, []);

    // Escape closes; focus moves into the dialog and back to the button afterwards;
    // the page behind doesn't scroll while it's open.
    React.useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        closeButtonRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            opener?.focus();
        };
    }, [onClose]);

    const levelHistory = data?.levels[wrHistoryKey(level)];
    const events = levelHistory
        ? (videoOnly ? levelHistory.historyVideo : levelHistory.history).filter(e => !e.reverted)
        : [];

    // Newest first; each row's note compares against the event before it.
    const rows = events
        .map((event, i) => {
            const previous = i > 0 ? events[i - 1] : null;
            let note = NOTES[event.type];
            if (event.type === 'wr') {
                note =
                    previous && previous.time !== null && event.time !== null
                        ? formatDifference(event.time - previous.time)
                        : 'First run';
            }
            const shown =
                event.type === 'tie' && event.added
                    ? event.players.filter(p => event.added!.includes(p.name))
                    : event.players;
            return { event, note, shown, isCurrent: i === events.length - 1 };
        })
        .reverse();

    const playerName = (name: string) => {
        const page = playerPages.get(name.trim());
        return page ? <Link href={'/player/' + page}>{name}</Link> : <span>{name}</span>;
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="wr-history-title"
                onClick={e => e.stopPropagation()}>
                <div className={styles.dialogHeader}>
                    <div>
                        <h3 id="wr-history-title">WR History</h3>
                        <p className={styles.subtitle}>
                            {title}
                            {videoOnly ? ' · video runs only' : ''}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close WR history">
                        ✕
                    </button>
                </div>
                <div className={styles.dialogBody}>
                    {failed ? (
                        <p className={styles.message}>Couldn&apos;t load the WR history.</p>
                    ) : !data ? (
                        <p className={styles.message}>Loading…</p>
                    ) : rows.length === 0 ? (
                        <p className={styles.message}>No WR history for this level yet.</p>
                    ) : (
                        <table className={styles.historyTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Player</th>
                                    <th className={styles.note}>Note</th>
                                    <th className={styles.videos}>Video</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ event, note, shown, isCurrent }, i) => (
                                    <tr
                                        key={event.date + event.type + i}
                                        className={isCurrent ? styles.current : undefined}>
                                        <td className={styles.date}>
                                            {event.type === 'initial'
                                                ? 'By ' + formatDate(event.date)
                                                : formatDate(event.date)}
                                        </td>
                                        <td className={styles.time}>
                                            {event.time !== null
                                                ? parseMilisecondsToUserTime(event.time)
                                                : '—'}
                                            {!!note && (
                                                <span className={styles.noteInline}>{note}</span>
                                            )}
                                        </td>
                                        <td>
                                            {shown.map((p, j) => (
                                                <React.Fragment key={p.name}>
                                                    {j > 0 && ', '}
                                                    {playerName(p.name)}
                                                </React.Fragment>
                                            ))}
                                        </td>
                                        <td className={styles.note}>{note}</td>
                                        <td className={styles.videos}>
                                            {shown.map(p =>
                                                p.link ? (
                                                    <a
                                                        key={p.name}
                                                        href={p.link}
                                                        rel="noreferrer"
                                                        target="_blank"
                                                        title={p.name + "'s video"}>
                                                        ✅
                                                    </a>
                                                ) : (
                                                    <span key={p.name} title="No video">
                                                        ❌
                                                    </span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!!data && (
                    <p className={styles.footnote}>
                        History starts {formatDate(data.from)}. Dates are when a run was added to
                        the IL sheet.
                    </p>
                )}
            </div>
        </div>
    );
}
