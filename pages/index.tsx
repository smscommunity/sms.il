import type { GetStaticProps, NextPage } from 'next';
import React from 'react';
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

interface ILPageProps {
    ilData: ILData[][];
    levelData: LevelData[];
    playerData: PlayerData[];
    timestamp: number;
}

const Home: NextPage<ILPageProps> = (props: ILPageProps) => {
    const { ilData, levelData, playerData, timestamp } = props;
    const dateStamp = new Date(timestamp);
    const [selectedIL, setSelectedIL] = React.useState(-1);
    const [hideAnon, setHideAnon] = React.useState(true);

    let filteredIls: ILData[] = [];
    let selectedILData: LevelData | undefined;

    if (selectedIL != -1) {
        selectedILData = levelData[selectedIL - 7];
        filteredIls = ilData[selectedIL - 7];
    } else {
        selectedILData = undefined;
        filteredIls = [];
    }

    let filteredPlayerData = playerData;
    let filteredIlData = filteredIls;

    if (hideAnon) {
        if (filteredIls.length > 0) {
            filteredIlData = [];
            let ilRank = 1;
            filteredIls.forEach(val => {
                if (val.playerData.name.indexOf('Anonymous ') != 0) {
                    const clonedVal = { ...val };
                    clonedVal.rank = ilRank;
                    filteredIlData.push(clonedVal);
                    ilRank++;
                }
            });
        }

        if (playerData.length > 0) {
            filteredPlayerData = [];
            let rank = 1;
            playerData.forEach(val => {
                if (val.name.indexOf('Anonymous ') != 0) {
                    const clonedVal = { ...val };
                    clonedVal.rank = rank;
                    filteredPlayerData.push(clonedVal);
                    rank++;
                }
            });
        }
    }
    const headerText = !!selectedILData
        ? selectedILData.world +
          ' - ' +
          selectedILData.episode +
          (!!selectedILData.subCategory ? ' (' + selectedILData.subCategory + ')' : '')
        : 'Super Mario Sunshine IL Leaderboards';
    return (
        <div className={styles.indexContainer}>
            <Head>
                <title>Super Mario Sunshine IL Leaderboard</title>
            </Head>
            <FilterHeader
                selectedIL={selectedIL}
                hideAnon={hideAnon}
                onHideAnonClicked={setHideAnon}
                levelData={levelData}
                onSelectedILChange={setSelectedIL}
                headerText={headerText}
            />
            <div>
                {filteredIlData.length > 0 ? (
                    <ILTable ils={filteredIlData} />
                ) : (
                    <PlayerTable players={filteredPlayerData} />
                )}
            </div>
            <Footer dateStamp={dateStamp} />
        </div>
    );
};

export default Home;

export const getStaticProps: GetStaticProps = async context => {
    const { ilData, levelData, playerData } = loadILXls();
    const timestamp = Date.now();
    return {
        props: {
            ilData,
            levelData,
            timestamp,
            playerData,
        },
    };
};
