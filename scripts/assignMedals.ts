// Medals only go to runs with a video. A run without one keeps its time and rank but gets
// no medal, and the next runs with video move up to take it (tied times share a medal).
// Expects one episode's runs sorted best-first. medal: 1 = gold, 2 = silver, 3 = bronze, 0 = none.
export default function assignMedals<T extends { time: number; link?: string | null }>(
    ils: T[]
): (T & { medal: number })[] {
    let videoCount = 0;
    let videoRank = 0;
    let lastVideoTime: number | null = null;
    return ils.map(il => {
        if (!il.link) return { ...il, medal: 0 };
        videoCount++;
        if (il.time !== lastVideoTime) {
            videoRank = videoCount;
            lastVideoTime = il.time;
        }
        return { ...il, medal: videoRank <= 3 ? videoRank : 0 };
    });
}
