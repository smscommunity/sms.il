import ILData from '../types/ILData';
import styles from '../styles/ILRow.module.css';
import React from 'react';
import Linkify from 'linkifyjs/react';

export interface ILRowProps {
    data: ILData;
    rank: number;
}

export default function ILRow(props: ILRowProps) {
    const { rank, data } = props;
    const { playerName, time, link, comment } = data;
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
                <td>{playerName}</td>
                <td className={styles.center}>{parseMilisecondsToUserTime(time)}</td>
                <td className={styles.center}>{!!link ? <a href={link}>✅</a> : '❌'}</td>
                <td className={styles.comments}>
                    <Linkify>{comment}</Linkify>
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
