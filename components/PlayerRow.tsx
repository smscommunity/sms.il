import PlayerData from '../types/PlayerData';
import styles from '../styles/ILRow.module.css';
import React from 'react';
import Link from 'next/link';

export interface PlayerRowProps {
    data: PlayerData;
}

export default function PlayerRow(props: PlayerRowProps) {
    const { data } = props;
    const { name, rank, points, medals } = data;
    return (
        <>
            <tr
                className={
                    styles.ilRow +
                    ' ' +
                    (rank == 1
                        ? styles.ilFirst
                        : rank == 2
                        ? styles.ilSecond
                        : rank == 3
                        ? styles.ilThird
                        : '')
                }>
                <td className={styles.center}>
                    {rank == 1 ? '🥇' : rank == 2 ? '🥈' : rank == 3 ? '🥉' : rank}
                </td>
                <td className={styles.playerName}>
                    <Link href={'/player/' + name}>{name}</Link>
                </td>
                <td className={styles.center}>{points}</td>
                <td>
                    <div className={styles.medalHolder}>
                        <span>{'🥇' + medals.gold}</span>
                        <span>{'🥈' + medals.silver}</span>
                        <span>{'🥉' + medals.bronze}</span>
                    </div>
                </td>
            </tr>
        </>
    );
}

function parseMilisecondsToUserTime(time: number) {
    const minutes = Math.floor(time / (60 * 1000));
    const seconds = Math.floor((time % (60 * 1000)) / 1000);
    const hundredths = Math.floor(((time % (60 * 1000)) % 1000) / 10);
    return (
        '' +
        (minutes > 0 ? minutes + ':' : '') +
        (seconds < 10 ? '0' + seconds : seconds) +
        '.' +
        (hundredths > 0 ? (hundredths < 10 ? '0' + hundredths : hundredths) : '00')
    );
}
