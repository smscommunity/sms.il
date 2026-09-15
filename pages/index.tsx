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
import buildCategoryStandings from '../scripts/buildCategoryStandings';
import { CATEGORIES } from '../data/categories';

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
    const [selectedCategory, setSelectedCategoryRaw] = React.useState<string | null>(null);
    const [selectedWorld, setSelectedWorldRaw] = React.useState('none');

    // World and category are two different ways to slice the same overall standings,
    // so picking one clears the other rather than trying to intersect them.
    const setSelectedWorld = (world: string) => {
        setSelectedWorldRaw(world);
        setSelectedCategoryRaw(null);
    };
    const setSelectedCategory = (category: string | null) => {
        setSelectedCategoryRaw(category);
        setSelectedWorldRaw('none');
    };
    const controlledSelectedWorld: [string, (world: string) => void] = [
        selectedWorld,
        setSelectedWorld,
    ];

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
    const displayedPlayerData =
        selectedIL != -1
            ? playerData
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
            : selectedWorld != 'none'
            ? ' - ' + selectedWorld
            : !!selectedCategoryLabel
            ? ' - ' + selectedCategoryLabel
            : '';
    const headerText = !!selectedILData
        ? selectedILData.world +
          ' - ' +
          selectedILData.episode +
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
      <FilterHeader
        selectedIL={selectedIL}
        controlledSelectedWorld={controlledSelectedWorld}
        levelData={levelData}
        onSelectedILChange={setSelectedIL}
        headerText={headerText}
      />
      {selectedIL == -1 && (
        <CategorySortControl
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={setSelectedCategory}
        />
      )}
      <div>
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
