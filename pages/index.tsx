import type { GetStaticProps, NextPage } from 'next';
import React from 'react';
import ILTable from '../components/ILTable';
import loadILXls from '../scripts/loadILXls';
import ILData from '../types/ILData';
import LevelData from '../types/LevelData';
import styles from '../styles/index.module.css';

interface ILPageProps {
    ilData: ILData[];
    levelData: LevelData[];
}

const Home: NextPage<ILPageProps> = (props: ILPageProps) => {
    const { ilData, levelData } = props;
    const primarySelect = [...new Set(levelData.filter(data => !!data).map(data => data.world))];
    const [selectedWorld, setSelectedWorld] = React.useState('none');
    const [selectedIL, setSelectedIL] = React.useState(-1);
    const onWorldChanged = React.useCallback((cb: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedWorld(cb.currentTarget.value);
        setSelectedIL(-1);
    }, []);
    const onSelectedILChanged = React.useCallback((cb: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedIL(parseInt(cb.currentTarget.value));
    }, []);
    const filteredEpisodes: (LevelData & { ilId: number })[] = [];
    if (selectedWorld != 'none') {
        levelData.forEach((data, index) => {
            if (data?.world == selectedWorld) {
                filteredEpisodes.push({
                    ilId: index,
                    ...data,
                });
            }
        });
    }

    let filteredIls: (ILData & { rank: number })[] = [];
    let selectedILData: LevelData | undefined;

    if (selectedWorld != 'none' && selectedIL != -1) {
        selectedILData = levelData[selectedIL];
        const filteredAndSorted = ilData
            .filter(value => value.ilId == selectedIL)
            .sort((a, b) => (selectedILData!.isReverse ? b.time - a.time : a.time - b.time));
        let rank = 0;
        filteredIls = filteredAndSorted.map((value, index) => {
            return {
                ...value,
                rank: index > 0 && filteredAndSorted[index - 1].time == value.time ? rank : ++rank,
            };
        });
    } else {
        selectedILData = undefined;
    }
    return (
        <div className={styles.indexContainer}>
            <header className={styles.ilHeader}>
                <div className={styles.ilSelector}>
                    <label htmlFor="world-select">World</label>
                    <select name="world" id="world-select" onChange={onWorldChanged}>
                        <option value="none" key="none"></option>
                        {primarySelect.map(world => {
                            return (
                                <option key={world} value={world}>
                                    {world}
                                </option>
                            );
                        })}
                    </select>
                    <label htmlFor="episode-select">Episode</label>
                    <select
                        name="episode"
                        id="episode-select"
                        disabled={filteredEpisodes.length == 0}
                        onChange={onSelectedILChanged}>
                        <option value="-1" key="none"></option>
                        {filteredEpisodes.map(episode => {
                            return (
                                <option key={episode.ilId} value={episode.ilId}>
                                    {episode.episode +
                                        (episode.subCategory ? ' // ' + episode.subCategory : '')}
                                </option>
                            );
                        })}
                    </select>
                </div>
                {!!selectedILData ? (
                    <h2>
                        {selectedILData.world +
                            ' - ' +
                            selectedILData.episode +
                            (!!selectedILData.subCategory
                                ? ' (' + selectedILData.subCategory + ')'
                                : '')}
                    </h2>
                ) : (
                    <h2>Super Mario Sunshine IL Leaderboards</h2>
                )}
            </header>
            <div>
                {filteredIls.length > 0 ? (
                    <ILTable ils={filteredIls} ilInfo={levelData[selectedIL]} />
                ) : undefined}
            </div>
            <footer className={styles.ilFooter}>
                Created with 🌞 by Lego | <a href="">Github</a> |{' '}
                <a href="https://sunmar.io/il">Main Sheet</a>
            </footer>
        </div>
    );
};

export default Home;

export const getStaticProps: GetStaticProps = async context => {
    const data = loadILXls();
    return {
        props: {
            ...data,
        },
    };
};
