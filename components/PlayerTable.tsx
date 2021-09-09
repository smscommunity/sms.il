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
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Points</th>
                        <th>Medals</th>
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
