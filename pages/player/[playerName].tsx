import { GetStaticPaths, GetStaticProps } from 'next';
import React from 'react';
import FilterHeader from '../../components/FilterHeader';
import Footer from '../../components/Footer';
import ILTable from '../../components/ILTable';
import loadILXls from '../../scripts/loadILXls';
import ILData from '../../types/ILData';
import PlayerData from '../../types/PlayerData';

export interface PlayerPageProps {
    playerData: PlayerData;
    playerIls: ILData[];
    timestamp: number;
}

export default function PlayerPage(props: PlayerPageProps) {
    const { playerData, playerIls, timestamp } = props;
    const [selectedIL, setSelectedIL] = React.useState(-1);
    const controlledSelectedWorld = React.useState('none');
    const [selectedWorld, setSelectedWorld] = controlledSelectedWorld;
    const levelData = playerIls.map(il => il.ilData).sort((a, b) => a.id - b.id);
    let selectedIlData = [];
    if (selectedWorld != 'none' || selectedIL != -1) {
        console.log(selectedWorld);
        selectedIlData = playerIls.filter(il =>
            selectedIL != -1 ? il.ilData.id == selectedIL : il.ilData.world == selectedWorld
        );
    } else {
        selectedIlData = playerIls;
    }
    return (
        <div>
            <FilterHeader
                selectedIL={selectedIL}
                controlledSelectedWorld={controlledSelectedWorld}
                levelData={levelData}
                onSelectedILChange={setSelectedIL}
                headerText={
                    playerData.name +
                    ' (Rank ' +
                    playerData.rank +
                    ': ' +
                    playerData.points +
                    ' points)'
                }
            />
            <ILTable
                ils={selectedIlData}
                isPlayerTable
                showEpisode={selectedIL == -1}
                showWorld={selectedWorld == 'none'}
            />
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
    playerIls?.sort((a, b) =>
        b.pointValue - a.pointValue != 0
            ? b.pointValue - a.pointValue
            : a.rank - b.rank != 0
            ? a.rank - b.rank
            : a.ilData.id - b.ilData.id
    );
    const playerData = data.playerData.find(entry => entry.name == playerName);
    const timestamp = Date.now();
    return {
        props: {
            playerData,
            playerIls,
            timestamp,
        },
    };
};
