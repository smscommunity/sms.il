import ILData from '../types/ILData';
import ILRow from './ILRow';
import styles from '../styles/ILTable.module.css';
import LevelData from '../types/LevelData';

export interface ILTableProps {
    ils: (ILData & { rank: number })[];
    ilInfo: LevelData;
}

export default function ILTable(props: ILTableProps) {
    return (
        <div
            style={{
                maxHeight: '100%',
            }}>
            <table className={styles.ilTable}>
                <thead className={styles.ilTableHeader}>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Time</th>
                        <th>VOD</th>
                        <th>Comment</th>
                    </tr>
                </thead>
                <tbody>
                    {props.ils.length > 0 &&
                        props.ils.map(il => <ILRow key={il.playerName} data={il} rank={il.rank} />)}
                </tbody>
            </table>
        </div>
    );
}
