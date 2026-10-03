import React from 'react';
import { CATEGORIES } from '../data/categories';
import styles from '../styles/CategorySortControl.module.css';

export const SORT_OVERALL = 'overall';

// When an episode is selected the category options aren't shown, so a category choice
// falls back to Overall (null) until the episode is cleared.
export function resolveCategory(selectedSort: string, episodeSelected: boolean) {
    const isCategory = CATEGORIES.some(category => category.key === selectedSort);
    return !episodeSelected && isCategory ? selectedSort : null;
}

export interface CategorySortControlProps {
    selectedSort: string;
    episodeSelected: boolean;
    onSelectedSortChange: (newValue: string) => void;
    hasVideoOnly: boolean;
    onHasVideoOnlyChange: (newValue: boolean) => void;
}

export default function CategorySortControl(props: CategorySortControlProps) {
    const {
        selectedSort,
        episodeSelected,
        onSelectedSortChange,
        hasVideoOnly,
        onHasVideoOnlyChange,
    } = props;
    const effectiveSort = resolveCategory(selectedSort, episodeSelected) ?? SORT_OVERALL;
    return (
        <div className={styles.categorySelector}>
            <label htmlFor="category-sort-select">Sort By</label>
            <select
                name="categorySort"
                id="category-sort-select"
                value={effectiveSort}
                onChange={e => onSelectedSortChange(e.currentTarget.value)}>
                <option value={SORT_OVERALL}>Overall</option>
                {!episodeSelected &&
                    CATEGORIES.map(category => (
                        <option key={category.key} value={category.key}>
                            {category.label}
                        </option>
                    ))}
            </select>
            <label className={styles.checkboxRow}>
                <input
                    type="checkbox"
                    checked={hasVideoOnly}
                    onChange={e => onHasVideoOnlyChange(e.currentTarget.checked)}
                />
                Has Video
            </label>
        </div>
    );
}
