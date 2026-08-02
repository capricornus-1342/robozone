export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomWeighted(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.value;
    }
    return items[items.length - 1].value;
}

export function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function generateRegions(count) {
    const regions = [];
    for (let i = 0; i < count; i++) {
        if (i < 26) {
            regions.push(String.fromCharCode(65 + i));
        } else {
            const first = Math.floor((i - 26) / 26);
            const second = (i - 26) % 26;
            regions.push(String.fromCharCode(65 + first) + String.fromCharCode(65 + second));
        }
    }
    return regions;
}

export function poissonInterval(mean) {
    return -Math.log(1 - Math.random()) * mean;
}
