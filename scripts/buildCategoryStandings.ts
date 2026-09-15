import ILData from '../types/ILData';
import PlayerData from '../types/PlayerData';
import { CATEGORIES } from '../data/categories';

export default function buildCategoryStandings(ilData: ILData[][]): Record<string, PlayerData[]> {
    const standingsByCategory: Record<string, PlayerData[]> = {};

    CATEGORIES.forEach(category => {
        const totals = new Map<string, PlayerData>();

        category.levelIds.forEach(levelId => {
            ilData[levelId - 7]?.forEach(il => {
                let player = totals.get(il.playerData.name);
                if (!player) {
                    player = {
                        name: il.playerData.name,
                        points: 0,
                        rank: 0,
                        medals: { gold: 0, silver: 0, bronze: 0 },
                        submissions: 0,
                    };
                    totals.set(il.playerData.name, player);
                }
                player.points += il.pointValue;
                player.submissions += 1;
                if (il.rank === 1) player.medals.gold += 1;
                else if (il.rank === 2) player.medals.silver += 1;
                else if (il.rank === 3) player.medals.bronze += 1;
            });
        });

        const sorted = [...totals.values()].sort((a, b) => b.points - a.points);
        let rank = 0;
        let skip = 0;
        sorted.forEach((player, index) => {
            if (index > 0 && sorted[index - 1].points === player.points) {
                skip++;
            } else {
                rank = rank + skip + 1;
                skip = 0;
            }
            player.rank = rank;
        });

        standingsByCategory[category.key] = sorted;
    });

    return standingsByCategory;
}
