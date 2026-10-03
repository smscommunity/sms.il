import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import React from 'react';
import FilterHeader from '../../components/FilterHeader';
import FilterControl from '../../components/FilterControl';
import Footer from '../../components/Footer';
import ILTable from '../../components/ILTable';
import loadILXls from '../../scripts/loadILXls';
import ILData from '../../types/ILData';
import PlayerData from '../../types/PlayerData';
import SortControl from '../../components/SortControl';
import CategorySortControl, {
    SORT_OVERALL,
    resolveCategory,
} from '../../components/CategorySortControl';
import { CATEGORIES } from '../../data/categories';
import styles from '../../styles/index.module.css';
import useTableWidth from '../../hooks/useTableWidth';
import { rerankVideoOnly } from '../../scripts/buildCategoryStandings';

export interface PlayerPageProps {
    playerData: PlayerData;
    playerIls: ILData[];
    // This player's runs with video, re-ranked as if runs without video didn't exist.
    playerVideoIls: ILData[];
    timestamp: number;
}

function sortByEpisode(a: ILData, b: ILData) {
    return a.ilData.id - b.ilData.id;
}

function sortByPoints(a: ILData, b: ILData) {
    return b.pointValue - a.pointValue != 0
        ? b.pointValue - a.pointValue
        : a.rank - b.rank != 0
        ? a.rank - b.rank
        : a.ilData.id - b.ilData.id
}

function sortByRank(a: ILData, b: ILData) {
    return a.rank - b.rank != 0
        ? a.rank - b.rank
        : b.pointValue - a.pointValue != 0
        ? b.pointValue - a.pointValue
        : a.ilData.id - b.ilData.id
}

export default function PlayerPage(props: PlayerPageProps) {
    const { playerData, playerIls, playerVideoIls, timestamp } = props;
    const [selectedIL, setSelectedIL] = React.useState(-1);
    const controlledSelectedWorld = React.useState('none');
    const [selectedWorld, setSelectedWorld] = controlledSelectedWorld;
    const [tableWrapperRef, tableWidth] = useTableWidth();
    const levelData = playerIls.map(il => il.ilData).sort((a, b) => a.id - b.id);
    const submittedCount = playerIls.length;
    const withVideoCount = playerIls.filter(il => !!il.link).length;
    const [selectedSort, setSelectedSort] = React.useState("Episode");
    const [selectedCategorySort, setSelectedCategorySort] = React.useState(SORT_OVERALL);
    const [hasVideoOnly, setHasVideoOnly] = React.useState(false);
    const selectedCategory = resolveCategory(selectedCategorySort, selectedIL != -1);
    const sortFunctions = new Map([
        ["Episode", sortByEpisode],
        ["Points", sortByPoints],
        ["Rank", sortByRank]
    ])
    const sourceIls = hasVideoOnly ? playerVideoIls : playerIls;
    let selectedIlData = [];
    if (selectedWorld != 'none' || selectedIL != -1) {
        console.log(selectedWorld);
        selectedIlData = sourceIls.filter(il =>
            selectedIL != -1 ? il.ilData.id == selectedIL : il.ilData.world == selectedWorld
        );
    } else {
        selectedIlData = [...sourceIls];
    }
    if (selectedCategory) {
        const categoryLevelIds = new Set(
            CATEGORIES.find(category => category.key == selectedCategory)?.levelIds
        );
        selectedIlData = selectedIlData.filter(il => categoryLevelIds.has(il.ilData.id));
    }
    selectedIlData.sort(sortFunctions.get(selectedSort))
    return (
           <div style={{ position: 'relative' }}>
    <a href="https://ilview.sunmar.io/" className={styles.homeLink}>
      <img src="/spinshine.gif" alt="Home" className={styles.homeIcon} />
    </a>
            <Head>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>{'Super Mario Sunshine IL Leaderboard - ' + playerData.name}</title>
            </Head>
            <FilterHeader
                headerText={
                    playerData.name +
                    ' (Rank ' +
                    playerData.rank +
                    ': ' +
                    playerData.points +
                    ' points) [' +
                    withVideoCount +
                    '/' +
                    submittedCount +
                    ']'
                }
            />
            <div className={styles.sortRow} style={tableWidth ? { width: tableWidth } : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
                    <FilterControl
                        selectedIL={selectedIL}
                        controlledSelectedWorld={controlledSelectedWorld}
                        levelData={levelData}
                        onSelectedILChange={setSelectedIL}
                    />
                    <SortControl
                        selectedSort={selectedSort}
                        sortOptions={[ ...sortFunctions.keys() ]}
                        onSelectedSortChangeInternal={setSelectedSort}
                    />
                </div>
                <CategorySortControl
                    selectedSort={selectedCategorySort}
                    episodeSelected={selectedIL != -1}
                    onSelectedSortChange={setSelectedCategorySort}
                    hasVideoOnly={hasVideoOnly}
                    onHasVideoOnlyChange={setHasVideoOnly}
                />
            </div>
            <div ref={tableWrapperRef}>
                <ILTable
                    ils={selectedIlData}
                    isPlayerTable
                    showEpisode={selectedIL == -1}
                    showWorld={selectedWorld == 'none'}
                />
            </div>
            <Footer dateStamp={new Date(timestamp)} />
        </div>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const data = loadILXls();
    const gennedPaths = Array.from(data.playerToIlMap.keys()).map(name => {
        return {
            params: { playerName: name },
        };
    });
    return {
        paths: gennedPaths,
        fallback: false,
    };
};

export const getStaticProps: GetStaticProps = async context => {
    const data = loadILXls();
    const playerName = context.params!.playerName as string;
    const playerIls = data.playerToIlMap.get(playerName);
    const playerData = data.playerData.find(entry => entry.name == playerName);
    const playerVideoIls = rerankVideoOnly(data.ilData)
        .flat()
        .filter(il => il.playerData.name == playerName);
    const timestamp = Date.now();
    return {
        props: {
            playerData,
            playerIls,
            playerVideoIls,
            timestamp,
        },
    };
};
