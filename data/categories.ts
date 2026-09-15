export interface Category {
    key: string;
    label: string;
    // References LevelData.id. To add a level to a category, add its id here.
    levelIds: number[];
}

export const CATEGORIES: Category[] = [
    {
        key: 'anyPercent',
        label: 'Any%',
        levelIds: [
            8, 9, 10, 11, 12, 13, 14, 15, 23, 24, 25, 26, 27, 28, 29, 31, 32, 46, 47, 53, 54, 55,
            56, 57, 60, 61, 63, 69, 70, 71, 72, 73, 74, 75, 76, 78, 84, 85, 86, 87, 88, 90, 91, 92,
            99, 101, 102, 103, 104, 105, 106, 112, 121, 122,
        ],
    },
    {
        key: 'nonAnyPercent',
        label: 'Non-Any%',
        levelIds: [
            7, 16, 17, 18, 19, 20, 21, 30, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 48, 49,
            50, 51, 58, 59, 64, 65, 66, 67, 79, 80, 81, 82, 89, 93, 94, 95, 96, 97, 100, 107, 108,
            109, 110, 113, 114, 115, 116, 117, 118, 119, 120, 123, 124, 125, 126, 127, 128, 129,
            130, 131, 132, 133,
        ],
    },
    {
        key: 'secrets',
        label: 'Secrets',
        levelIds: [10, 14, 28, 39, 55, 60, 71, 74, 91, 104],
    },
    {
        key: '100s',
        label: '100s',
        levelIds: [21, 36, 51, 67, 82, 97, 110, 115],
    },
];
