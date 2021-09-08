export default interface PlayerData {
    name: string;
    points: number;
    medals: {
        gold: number;
        silver: number;
        bronze: number;
    }
    submissions: number;
    comment?: string;
}