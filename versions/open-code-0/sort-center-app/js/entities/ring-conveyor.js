import { Config } from '../config/parameters.js';

export class RingConveyor {
    constructor(buildingBounds) {
        this.bounds = buildingBounds;
        this.speed = Config.conveyor.speed;
        this.beltWidth = Config.conveyor.beltWidth;
        this._path = [];
        this._totalLength = 0;
        this._buildPath();
    }

    _buildPath() {
        const b = this.bounds;
        const pad = Config.conveyor.loopPaddingX;
        const padY = Config.conveyor.loopPaddingY;
        const r = Config.conveyor.cornerRadius;

        const left = b.x + pad;
        const right = b.x + b.width - pad;
        const top = b.y + padY;
        const bottom = b.y + b.height - padY;
        const midY = (top + bottom) / 2;

        this._corners = [
            { x: left + r, y: top + r },
            { x: right - r, y: top + r },
            { x: right - r, y: bottom - r },
            { x: left + r, y: bottom - r },
        ];

        this._segments = [];
        const segs = 200;
        const stepsPerSeg = 8;
        const totalSteps = segs * stepsPerSeg;

        for (let i = 0; i < totalSteps; i++) {
            const t = i / totalSteps;
            const pt = this._getPointOnLoop(t);
            this._path.push(pt);
        }

        this._totalLength = 0;
        for (let i = 1; i < this._path.length; i++) {
            const dx = this._path[i].x - this._path[i - 1].x;
            const dy = this._path[i].y - this._path[i - 1].y;
            this._totalLength += Math.sqrt(dx * dx + dy * dy);
        }
    }

    _getPointOnLoop(t) {
        const b = this.bounds;
        const pad = Config.conveyor.loopPaddingX;
        const padY = Config.conveyor.loopPaddingY;
        const r = Config.conveyor.cornerRadius;

        const left = b.x + pad;
        const right = b.x + b.width - pad;
        const top = b.y + padY;
        const bottom = b.y + b.height - padY;

        const perimeter = 2 * (right - left) + 2 * (bottom - top) - 8 * r + 2 * Math.PI * r;

        let d = t * perimeter;

        const topLen = (right - left) - 2 * r;
        const cornerArc = (Math.PI / 2) * r;
        const rightLen = (bottom - top) - 2 * r;

        if (d < topLen) {
            return { x: left + r + d, y: top, angle: 0 };
        }
        d -= topLen;

        if (d < cornerArc) {
            const a = -Math.PI / 2 + (d / r);
            return { x: right - r + r * Math.cos(a), y: top + r + r * Math.sin(a), angle: a + Math.PI / 2 };
        }
        d -= cornerArc;

        if (d < rightLen) {
            return { x: right, y: top + r + d, angle: Math.PI / 2 };
        }
        d -= rightLen;

        if (d < cornerArc) {
            const a = 0 + (d / r);
            return { x: right - r + r * Math.cos(a), y: bottom - r + r * Math.sin(a), angle: a + Math.PI / 2 };
        }
        d -= cornerArc;

        const botLen = (right - left) - 2 * r;
        if (d < botLen) {
            return { x: right - r - d, y: bottom, angle: Math.PI };
        }
        d -= botLen;

        if (d < cornerArc) {
            const a = Math.PI / 2 + (d / r);
            return { x: left + r + r * Math.cos(a), y: bottom - r + r * Math.sin(a), angle: a + Math.PI / 2 };
        }
        d -= cornerArc;

        const leftLen = (bottom - top) - 2 * r;
        if (d < leftLen) {
            return { x: left, y: bottom - r - d, angle: -Math.PI / 2 };
        }
        d -= leftLen;

        const a = Math.PI + (d / r);
        return { x: left + r + r * Math.cos(a), y: top + r + r * Math.sin(a), angle: a + Math.PI / 2 };
    }

    getPointAtProgress(progress) {
        const idx = Math.floor(progress * (this._path.length - 1));
        const nextIdx = Math.min(idx + 1, this._path.length - 1);
        const frac = progress * (this._path.length - 1) - idx;

        const p1 = this._path[idx];
        const p2 = this._path[nextIdx];

        return {
            x: p1.x + (p2.x - p1.x) * frac,
            y: p1.y + (p2.y - p1.y) * frac,
            angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
        };
    }

    getProgressForTime(dt) {
        return (this.speed * dt) / this._totalLength;
    }
}
