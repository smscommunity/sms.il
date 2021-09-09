export default interface PlayerData {
    name: string;
    points: number;
    rank: number;
    medals: {
        gold: number;
        silver: number;
        bronze: number;
    };
    submissions: number;
    comment?: string;
}
