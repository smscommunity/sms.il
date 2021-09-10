import React from 'react';
import styles from '../styles/SortControl.module.css';

export interface SortControlProps {
    onSelectedSortChange: (newValue: number) => void;
}

export default function SortControl(props: SortControlProps) {
    const onSelectedSortChange = React.useCallback(
        (cb: React.ChangeEvent<HTMLSelectElement>) => {
            props.onSelectedSortChange(parseInt(cb.currentTarget.value));
        },
        [props.onSelectedSortChange]
    );

    return (
        <>
            <div className={styles.sortSelector}>
                <label htmlFor="sort-select">Sort By</label>
                <select name="sort" id="sort-select" onChange={onSelectedSortChange}>
                    <option value="0" key="points">Points</option>
                    <option value="1" key="rank">Rank</option>
                </select>
            </div>
        </>
    );
}
