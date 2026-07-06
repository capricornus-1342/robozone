import { generateId, randomElement } from "../utils.js";
import { Box } from "./Box.js";

export class Pallet {
    constructor({ numBoxes, destRegions }) {
        this.id = generateId('pallet');
        this.numBoxes = numBoxes || Math.floor(Math.random() * 20) + 10;
        this.destRegions = destRegions || [randomElement(['R1', 'R2', 'R3', 'R4', 'R5'])];
        this.weight = this.numBoxes * (Math.random() * 20 + 5);
    }

    unpack() {
        const boxes = [];
        for (let i = 0; i < this.numBoxes; i++) {
            const box = new Box({ destRegion: randomElement(this.destRegions) });
            box.isOnPallet = true;
            boxes.push(box);
        }
        return boxes;
    }
}
