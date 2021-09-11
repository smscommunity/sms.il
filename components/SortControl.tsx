import React from 'react';
import styles from '../styles/SortControl.module.css';

export interface SortControlProps {
    selectedSort: string;
    sortOptions: string[];
    onSelectedSortChange: (newValue: string) => void;
}

export default function SortControl(props: SortControlProps) {
    const { selectedSort, sortOptions } = props;
    const onSelectedSortChange = React.useCallback(
        (cb: React.ChangeEvent<HTMLSelectElement>) => {
            props.onSelectedSortChange(cb.currentTarget.value);
        },
        [props.onSelectedSortChange]
    );

    return (
        <>
            <div className={styles.sortSelector}>
                <label htmlFor="sort-select">Sort By</label>
                <select name="sort" id="sort-select" onChange={onSelectedSortChange}>
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
