import { Box } from './Box.js';

let nextId = 1;

export class Pallet {
    constructor(numBoxes, destRegions) {
        this.id = nextId++;
        this.numBoxes = numBoxes;
        this.destRegions = destRegions;
        this.weight = numBoxes * 5;
    }

    unpack() {
        const boxes = [];
        for (let i = 0; i < this.numBoxes; i++) {
            const region = this.destRegions[Math.floor(Math.random() * this.destRegions.length)];
            const box = new Box(5 + Math.random() * 10, region);
            box.isOnPallet = true;
            boxes.push(box);
        }
        return boxes;
    }
}

export function resetPalletId() { nextId = 1; }
