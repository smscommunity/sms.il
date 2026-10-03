import type { GetStaticProps, NextPage } from 'next';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import ILTable from '../components/ILTable';
import loadILXls from '../scripts/loadILXls';
import ILData from '../types/ILData';
import LevelData from '../types/LevelData';
import styles from '../styles/index.module.css';
import Head from 'next/head';
import Footer from '../components/Footer';
import FilterHeader from '../components/FilterHeader';
import PlayerTable from '../components/PlayerTable';
import PlayerData from '../types/PlayerData';
import CategorySortControl, {
    SORT_OVERALL,
    resolveCategory,
} from '../components/CategorySortControl';
import FilterControl from '../components/FilterControl';
import buildCategoryStandings, {
    rerankIls,
    rerankVideoOnly,
} from '../scripts/buildCategoryStandings';
import { CATEGORIES } from '../data/categories';
import useTableWidth from '../hooks/useTableWidth';

interface ILPageProps {
    ilData: ILData[][];
    levelData: LevelData[];
    playerData: PlayerData[];
    categoryPlayerData: Record<string, PlayerData[]>;
    worldPlayerData: Record<string, PlayerData[]>;
    timestamp: number;
}

const Home: NextPage<ILPageProps> = (props: ILPageProps) => {
    const { ilData, levelData, playerData, categoryPlayerData, worldPlayerData, timestamp } =
        props;
    const dateStamp = new Date(timestamp);
    const router = useRouter();
    const [selectedIL, setSelectedIL] = React.useState(-1);
    const [selectedSort, setSelectedSort] = React.useState(SORT_OVERALL);
    const [hasVideoOnly, setHasVideoOnly] = React.useState(false);
    const controlledSelectedWorld = React.useState('none');
    const [selectedWorld, setSelectedWorld] = controlledSelectedWorld;
    const [tableWrapperRef, tableWidth] = useTableWidth();

    React.useEffect(() => {
        if (!router.query.il) return;
        const linkedIL = parseInt(router.query.il as string);
        const linkedILData = levelData[linkedIL - 7];
        if (!linkedILData) return;
        setSelectedIL(linkedIL);
        setSelectedWorld(linkedILData.world);
    }, [router.query.il]);

    const selectedCategory = resolveCategory(selectedSort, selectedIL != -1);

    let filteredIls: ILData[] = [];
    let selectedILData: LevelData | undefined;

    if (selectedIL != -1) {
        selectedILData = levelData[selectedIL - 7];
        filteredIls = ilData[selectedIL - 7] ?? [];
        if (hasVideoOnly) filteredIls = rerankIls(filteredIls.filter(il => !!il.link));
    } else {
        selectedILData = undefined;
        filteredIls = [];
    }
    const worldAndCategoryPlayerData = React.useMemo(() => {
        if (selectedWorld == 'none' || !selectedCategory) return null;
        const categoryLevelIds = new Set(
            CATEGORIES.find(category => category.key == selectedCategory)?.levelIds
        );
        const combinedLevelIds = levelData
            .filter(level => !!level && level.world == selectedWorld && categoryLevelIds.has(level.id))
            .map(level => level.id);
        return buildCategoryStandings(ilData, [
            { key: 'combined', label: '', levelIds: combinedLevelIds },
        ]).combined;
    }, [ilData, levelData, selectedWorld, selectedCategory]);
    // Standings as if runs without video didn't exist, for the selected world and/or category.
    const videoOnlyIlData = React.useMemo(() => rerankVideoOnly(ilData), [ilData]);
    const hasVideoPlayerData = React.useMemo(() => {
        if (!hasVideoOnly) return null;
        const categoryLevelIds = !!selectedCategory
            ? new Set(CATEGORIES.find(category => category.key == selectedCategory)?.levelIds)
            : null;
        const levelIds = levelData
            .filter(
                level =>
                    !!level &&
                    (selectedWorld == 'none' || level.world == selectedWorld) &&
                    (!categoryLevelIds || categoryLevelIds.has(level.id))
            )
            .map(level => level.id);
        return buildCategoryStandings(videoOnlyIlData, [
            { key: 'hasVideo', label: '', levelIds },
        ]).hasVideo;
    }, [videoOnlyIlData, levelData, selectedWorld, selectedCategory, hasVideoOnly]);
    const displayedPlayerData =
        selectedIL != -1
            ? playerData
            : !!hasVideoPlayerData
            ? hasVideoPlayerData
            : !!worldAndCategoryPlayerData
            ? worldAndCategoryPlayerData
            : selectedWorld != 'none'
            ? worldPlayerData[selectedWorld] ?? []
            : !!selectedCategory
            ? categoryPlayerData[selectedCategory]
            : playerData;
    const selectedCategoryLabel = CATEGORIES.find(category => category.key === selectedCategory)
        ?.label;
    const overallSuffix =
        selectedIL != -1
            ? ''
            : [
                  selectedWorld != 'none' ? selectedWorld : null,
                  selectedCategoryLabel,
                  hasVideoOnly ? 'Has Video' : null,
              ]
                  .filter(part => !!part)
                  .map(part => ' - ' + part)
                  .join('');
    const headerText = !!selectedILData
        ? selectedILData.world +
          ' - ' +
          selectedILData.episode.replace(/^Ep\.\s*/, '') +
          (!!selectedILData.subCategory ? ' (' + selectedILData.subCategory + ')' : '')
        : 'Super Mario Sunshine IL Leaderboards' + overallSuffix;
return (
  <>
    <a href="https://ilview.sunmar.io/" className={styles.homeLink}>
      <img src="/spinshine.gif" alt="Home" className={styles.homeIcon} />
    </a>
    <div className={styles.indexContainer}>
      <Head>
        <title>Super Mario Sunshine IL Leaderboard</title>
      </Head>
      <FilterHeader headerText={headerText} />
      <div className={styles.sortRow} style={tableWidth ? { width: tableWidth } : undefined}>
        <FilterControl
          selectedIL={selectedIL}
          controlledSelectedWorld={controlledSelectedWorld}
          levelData={levelData}
          onSelectedILChange={setSelectedIL}
        />
        <CategorySortControl
          selectedSort={selectedSort}
          episodeSelected={selectedIL != -1}
          onSelectedSortChange={setSelectedSort}
          hasVideoOnly={hasVideoOnly}
          onHasVideoOnlyChange={setHasVideoOnly}
        />
      </div>
      <div ref={tableWrapperRef}>
        {selectedIL != -1 ? (
          <ILTable ils={filteredIls} />
        ) : (
          <PlayerTable players={displayedPlayerData} />
        )}
      </div>
      <Footer dateStamp={dateStamp} />
    </div>
  </>
);
};

export default Home;

export const getStaticProps: GetStaticProps = async context => {
    const { ilData, levelData, playerData } = loadILXls();
    const categoryPlayerData = buildCategoryStandings(ilData, CATEGORIES);
    const namedLevels = levelData.filter((level): level is LevelData => !!level);
    const worldNames = [...new Set(namedLevels.map(level => level.world))];
    const worldCategories = worldNames.map(world => ({
        key: world,
        label: world,
        levelIds: namedLevels.filter(level => level.world === world).map(level => level.id),
    }));
    const worldPlayerData = buildCategoryStandings(ilData, worldCategories);
    const timestamp = Date.now();
    return {
        props: {
            ilData,
            levelData,
            timestamp,
            playerData,
            categoryPlayerData,
            worldPlayerData,
        },
    };
};
