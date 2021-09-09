import React from 'react';
import LevelData from '../types/LevelData';
import FilterControl from './FilterControl';
import styles from '../styles/FilterHeader.module.css';

export interface FilterHeaderProps {
    selectedIL: number;
    controlledSelectedWorld?: [string, (s: string) => void];
    levelData: LevelData[];
    onSelectedILChange: (newValue: number) => void;
    headerText: string;
}

export default function FilterHeader(props: FilterHeaderProps) {
    const { selectedIL, onSelectedILChange, levelData, headerText, controlledSelectedWorld } =
        props;
    return (
        <header className={styles.ilHeader}>
            <FilterControl
                selectedIL={selectedIL}
                controlledSelectedWorld={controlledSelectedWorld}
                onSelectedILChange={onSelectedILChange}
                levelData={levelData}
            />
            <h2>{headerText}</h2>
        </header>
    );
}
