import ILData from '../types/ILData';
import styles from '../styles/ILRow.module.css';
import React from 'react';
import Linkify from 'linkifyjs/react';
import Link from 'next/link';

export interface ILRowProps {
    data: ILData;
    showWorld?: boolean;
    showEpisode?: boolean;
    isPlayerTable?: boolean;
}

export default function ILRow(props: ILRowProps) {
    const { data, showWorld, showEpisode, isPlayerTable } = props;
    const { playerData, time, link, comment, rank, medal, pointValue } = data;
    const { name } = playerData;
    // Medals follow `medal` (video-only), not rank, so a top time without video shows its number.
    return (
        <>
            <tr
                className={
                    styles.ilRow +
                    ' ' +
                    (medal == 1
                        ? styles.ilFirst
                        : medal == 2
                        ? styles.ilSecond
                        : medal == 3
                        ? styles.ilThird
                        : '')
                }>
                <td className={styles.center}>
                    {medal == 1 ? '🥇' : medal == 2 ? '🥈' : medal == 3 ? '🥉' : rank}
                </td>
                {isPlayerTable && <td className={styles.center}>{pointValue}</td>}
                {!isPlayerTable && (
                    <td className={styles.playerName}>
                        <Link href={'/player/' + name}>{name}</Link>
                    </td>
                )}
                {showWorld && <td>{data.ilData.world}</td>}
                {showEpisode && (
                    <td>
                        <Link href={'/?il=' + data.ilData.id}>
                            {data.ilData.episode.replace(/^Ep\.\s*/, '') +
                                (data.ilData.subCategory ? ' // ' + data.ilData.subCategory : '')}
                        </Link>
                    </td>
                )}
                <td className={styles.center}>{parseMilisecondsToUserTime(time)}</td>
                <td className={styles.center}>
                    {!!link ? (
                        <a href={link} rel={'noreferrer'} target={'_blank'}>
                            ✅
                        </a>
                    ) : (
                        '❌'
                    )}
                </td>
                <td className={styles.comments}>
                    <Linkify>{comment}</Linkify>
                </td>
            </tr>
        </>
    );
}

function parseMilisecondsToUserTime(time: number) {
    // Round to the nearest hundredth first (e.g. 1:22.549 -> 1:22.55), so carries roll over correctly.
    const totalHundredths = Math.round(time / 10);
    const minutes = Math.floor(totalHundredths / 6000);
    const seconds = Math.floor((totalHundredths % 6000) / 100);
    const hundredths = totalHundredths % 100;
    return (
        '' +
        (minutes > 0 ? minutes + ':' : '') +
        (seconds < 10 ? '0' + seconds : seconds) +
        '.' +
        (hundredths > 0 ? (hundredths < 10 ? '0' + hundredths : hundredths) : '00')
    );
}
