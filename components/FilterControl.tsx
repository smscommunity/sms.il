import React from 'react';
import LevelData from '../types/LevelData';
import styles from '../styles/FilterControl.module.css';

export interface FilterControlProps {
    selectedIL: number;
    levelData: LevelData[];
    onSelectedILChange: (newValue: number) => void;
}

export default function FilterControl(props: FilterControlProps) {
    const { selectedIL, levelData } = props;
    const [selectedWorld, setSelectedWorld] = React.useState('none');
    const primarySelect = [...new Set(levelData.filter(data => !!data).map(data => data.world))];
    const onWorldChanged = React.useCallback((cb: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedWorld(cb.currentTarget.value);
        props.onSelectedILChange(-1);
    }, []);
    const onSelectedILChanged = React.useCallback((cb: React.ChangeEvent<HTMLSelectElement>) => {
        props.onSelectedILChange(parseInt(cb.currentTarget.value));
    }, []);

    const filteredEpisodes: LevelData[] = [];
    if (selectedWorld != 'none') {
        levelData.forEach((data, index) => {
            if (data?.world == selectedWorld) {
                filteredEpisodes.push(data);
            }
        });
    }

    return (
        <>
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
                    value={selectedIL}
                    disabled={filteredEpisodes.length == 0}
                    onChange={onSelectedILChanged}>
                    <option value="-1" key="none"></option>
                    {filteredEpisodes.map(episode => {
                        return (
                            <option key={episode.id} value={episode.id}>
                                {episode.episode +
                                    (episode.subCategory ? ' // ' + episode.subCategory : '')}
                            </option>
                        );
                    })}
                </select>
            </div>
        </>
    );
}
