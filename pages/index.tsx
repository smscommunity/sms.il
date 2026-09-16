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
import CategorySortControl from '../components/CategorySortControl';
import FilterControl from '../components/FilterControl';
import buildCategoryStandings from '../scripts/buildCategoryStandings';
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
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
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

    let filteredIls: ILData[] = [];
    let selectedILData: LevelData | undefined;

    if (selectedIL != -1) {
        selectedILData = levelData[selectedIL - 7];
        filteredIls = ilData[selectedIL - 7];
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
    const displayedPlayerData =
        selectedIL != -1
            ? playerData
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
            : selectedWorld != 'none' && !!selectedCategoryLabel
            ? ' - ' + selectedWorld + ' - ' + selectedCategoryLabel
            : selectedWorld != 'none'
            ? ' - ' + selectedWorld
            : !!selectedCategoryLabel
            ? ' - ' + selectedCategoryLabel
            : '';
    const headerText = !!selectedILData
        ? selectedILData.world +
          ' - ' +
          selectedILData.episode.replace(/^Ep\.\s*/, '') +
          (!!selectedILData.subCategory ? ' (' + selectedILData.subCategory + ')' : '')
        : 'Super Mario Sunshine IL Leaderboards' + overallSuffix;
return (
  <>
    <a href="https://ilview.sunmar.io/"
        style={{
        position: 'fixed',
        top: 10,
        left: 10,
        padding: '0',
        background: 'none',
        color: '#fff',
        borderRadius: '4px',
        textDecoration: 'none',
        fontWeight: 'bold',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        }}
      >
            <img src="/spinshine.gif"
          alt="Home"
          style={{
        width: '50px',
        height: '50px',
        display: 'block',
      }}/>
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
        {selectedIL == -1 && (
          <CategorySortControl
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
          />
        )}
      </div>
      <div ref={tableWrapperRef}>
        {filteredIls.length > 0 ? (
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
