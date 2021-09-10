import ILData from '../types/ILData';
import ILRow from './ILRow';
import styles from '../styles/ILTable.module.css';

export interface ILTableProps {
    ils: ILData[];
    showWorld?: boolean;
    showEpisode?: boolean;
    isPlayerTable?: boolean;
}

export default function ILTable(props: ILTableProps) {
    const { ils, showWorld, showEpisode, isPlayerTable } = props;
    return (
        <div
            style={{
                maxHeight: '100%',
            }}>
            <table className={styles.ilTable}>
                <thead className={styles.ilTableHeader}>
                    <tr>
                        <th>Rank</th>
                        {isPlayerTable && <th>Points</th>}
                        {!isPlayerTable && <th>Player</th>}
                        {showWorld && <th>World</th>}
                        {showEpisode && <th>Episode</th>}
                        <th>Time</th>
                        <th>VOD</th>
                        <th>Comment</th>
                    </tr>
                </thead>
                <tbody>
                    {ils.length > 0 &&
                        ils.map(il => (
                            <ILRow
                                key={il.playerData.name + il.ilData.id}
                                data={il}
                                showWorld={showWorld}
                                showEpisode={showEpisode}
                                isPlayerTable={isPlayerTable}
                            />
                        ))}
                </tbody>
            </table>
        </div>
    );
}
