import LevelData from './LevelData';
import PlayerData from './PlayerData';

export default interface ILData {
    ilData: LevelData;
    playerData: PlayerData;
    time: number;
    link: string;
    rank: number;
    comment?: string;
}
