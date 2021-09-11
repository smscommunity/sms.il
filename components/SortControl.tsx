import React from 'react';
import styles from '../styles/SortControl.module.css';

export interface SortControlProps {
    selectedSort: string;
    sortOptions: string[];
    onSelectedSortChangeInternal: (newValue: string) => void;
}

export default function SortControl(props: SortControlProps) {
    const { selectedSort, sortOptions, onSelectedSortChangeInternal } = props;
    const onSelectedSortChange = React.useCallback(
        (cb: React.ChangeEvent<HTMLSelectElement>) => {
            onSelectedSortChangeInternal(cb.currentTarget.value);
        },
        [onSelectedSortChangeInternal]
    );

    return (
        <>
            <div className={styles.sortSelector}>
                <label htmlFor="sort-select">Sort By</label>
                <select
                    name="sort"
                    id="sort-select"
                    value={selectedSort}
                    disabled={sortOptions.length == 0}
                    onChange={onSelectedSortChange}>
                    {sortOptions.map(sort => {
                        return (
                            <option key={sort} value={sort}>
                                {sort}
                            </option>
                        );
                    })}
                </select>
            </div>
        </>
    );
}
