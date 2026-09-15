import React from 'react';
import { CATEGORIES } from '../data/categories';
import styles from '../styles/CategorySortControl.module.css';

export interface CategorySortControlProps {
    selectedCategory: string | null;
    onSelectedCategoryChange: (newValue: string | null) => void;
}

export default function CategorySortControl(props: CategorySortControlProps) {
    const { selectedCategory, onSelectedCategoryChange } = props;
    return (
        <div className={styles.categorySelector}>
            <label>Sort By</label>
            <button
                type="button"
                className={selectedCategory === null ? styles.selected : ''}
                onClick={() => onSelectedCategoryChange(null)}>
                Overall
            </button>
            {CATEGORIES.map(category => (
                <button
                    key={category.key}
                    type="button"
                    className={selectedCategory === category.key ? styles.selected : ''}
                    onClick={() => onSelectedCategoryChange(category.key)}>
                    {category.label}
                </button>
            ))}
        </div>
    );
}
