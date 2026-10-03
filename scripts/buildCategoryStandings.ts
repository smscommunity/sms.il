import ILData from '../types/ILData';
import PlayerData from '../types/PlayerData';
import { Category } from '../data/categories';

export default function buildCategoryStandings(
    ilData: ILData[][],
    categories: Category[]
): Record<string, PlayerData[]> {
    const standingsByCategory: Record<string, PlayerData[]> = {};

    categories.forEach(category => {
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

// Re-ranks one episode's runs (already sorted best-first) as if they were the only
// runs submitted. Ranks and points follow the same tie rules as loadILXls.
export function rerankIls(ils: ILData[]): ILData[] {
    let rank = 0;
    let skip = 0;
    const ranked = ils.map((il, index) => {
        if (index > 0 && ils[index - 1].time == il.time) {
            skip++;
        } else {
            rank = rank + skip + 1;
            skip = 0;
        }
        return { ...il, rank };
    });

    let points = 0;
    skip = 0;
    ranked.reverse();
    return ranked
        .map((il, index) => {
            if (index > 0 && il.time == ranked[index - 1].time) {
                skip++;
            } else {
                points = points + skip + 1;
                skip = 0;
            }
            return { ...il, pointValue: points };
        })
        .reverse();
}

// Every episode's runs, keeping only those with a video and re-ranked among themselves.
export function rerankVideoOnly(ilData: ILData[][]): ILData[][] {
    // Some slots have no episode (null after page-data serialization), so skip those.
    return ilData.map(ils => (ils ? rerankIls(ils.filter(il => !!il.link)) : ils));
}
