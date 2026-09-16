import React from 'react';
import styles from '../styles/FilterHeader.module.css';

export interface FilterHeaderProps {
    headerText: string;
}

export default function FilterHeader(props: FilterHeaderProps) {
    const { headerText } = props;
    return (
        <header className={styles.ilHeader}>
            <h2>{headerText}</h2>
        </header>
    );
}
