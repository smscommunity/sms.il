import styles from '../styles/footer.module.css';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export interface FooterProps {
    dateStamp: Date;
}

export default function Footer(props: FooterProps) {
    return (
        <footer className={styles.ilFooter}>
            Created with 🌞 by Lego |{' '}
            <Tippy content={'This website updates approximately every 15 minutes.'}>
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
