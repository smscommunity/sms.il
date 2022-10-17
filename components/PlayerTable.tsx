import PlayerData from '../types/PlayerData';
import PlayerRow from './PlayerRow';
import styles from '../styles/PlayerTable.module.css';

export interface PlayerTableProps {
    players: PlayerData[];
}

export default function PlayerTable(props: PlayerTableProps) {
    const { players } = props;
    return (
        <div
            style={{
                maxHeight: '100%',
            }}>
            <table className={styles.playerTable}>
                <thead className={styles.playerTableHeader}>
                    <tr>
                        <th className={styles.rankPointsRowWidth}>Rank</th>
                        <th className={styles.playerRowWidth}>Player</th>
                        <th className={styles.rankPointsRowWidth}>Points</th>
                        <th className={styles.medalWidth}>Medals</th>
                    </tr>
                </thead>
                <tbody>
                    {players.length > 0 &&
                        players.map(player => <PlayerRow key={player.name} data={player} />)}
                </tbody>
            </table>
        </div>
    );
}
