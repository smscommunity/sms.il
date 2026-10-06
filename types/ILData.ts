import LevelData from './LevelData';
import PlayerData from './PlayerData';

export default interface ILData {
    ilData: LevelData;
    playerData: PlayerData;
    time: number;
    link: string;
    rank: number;
    // 1 = gold, 2 = silver, 3 = bronze, 0 = none. Only runs with a video can medal.
    medal: number;
    comment?: string;
    pointValue: number;
}
