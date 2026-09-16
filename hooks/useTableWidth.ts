import { useEffect, useRef, useState } from 'react';

export default function useTableWidth() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState<number>();

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const measure = () => {
            const table = el.querySelector('table');
            if (table) setWidth(table.getBoundingClientRect().width);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return [wrapperRef, width] as const;
}
