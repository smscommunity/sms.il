import React from 'react';
import { CATEGORIES } from '../data/categories';
import styles from '../styles/CategorySortControl.module.css';

export const SORT_OVERALL = 'overall';
export const SORT_HAS_VIDEO = 'hasVideo';

// Turns the dropdown value into what the pages need. When an episode is selected the
// category options aren't shown, so a category choice falls back to Overall.
export function resolveCategorySort(selectedSort: string, episodeSelected: boolean) {
    const isCategory = CATEGORIES.some(category => category.key === selectedSort);
    const effectiveSort = episodeSelected && isCategory ? SORT_OVERALL : selectedSort;
    return {
        effectiveSort,
        hasVideoOnly: effectiveSort === SORT_HAS_VIDEO,
        selectedCategory: !episodeSelected && isCategory ? selectedSort : null,
    };
}

export interface CategorySortControlProps {
    selectedSort: string;
    episodeSelected: boolean;
    onSelectedSortChange: (newValue: string) => void;
}

export default function CategorySortControl(props: CategorySortControlProps) {
    const { selectedSort, episodeSelected, onSelectedSortChange } = props;
    const { effectiveSort } = resolveCategorySort(selectedSort, episodeSelected);
    return (
        <div className={styles.categorySelector}>
            <label htmlFor="category-sort-select">Sort By</label>
            <select
                name="categorySort"
                id="category-sort-select"
                value={effectiveSort}
                onChange={e => onSelectedSortChange(e.currentTarget.value)}>
                <option value={SORT_OVERALL}>Overall</option>
                <option value={SORT_HAS_VIDEO}>Has Video</option>
                {!episodeSelected &&
                    CATEGORIES.map(category => (
                        <option key={category.key} value={category.key}>
                            {category.label}
                        </option>
                    ))}
            </select>
        </div>
    );
}
