import styles from '../styles/footer.module.css';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export interface FooterProps {
    dateStamp: Date;
}

export default function Footer(props: FooterProps) {
    return (
        <footer className={styles.ilFooter}>
            Created by Lego | Updated by Zeldocto |{' '}
            <Tippy content={'This website checks for updates every 10 minutes, and only updates if the sheet was.'}>
                <span
                    style={{
                        padding: '0 4px',
                    }}>
                    {' '}
                    Last Updated: {props.dateStamp.toLocaleString()}
                </span>
            </Tippy>{' '}
            | <a href="https://github.com/Lego6245/sms.il">Github</a> |{' '}
            <a href="https://sunmar.io/il">Main Sheet</a>
        </footer>
    );
}
