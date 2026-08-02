import { generateId } from "../utils.js";

export class Item {
    constructor({ weight, destRegion, fragile }) {
        this.id = generateId('item');
        this.weight = weight || Math.random() * 5 + 0.1;
        this.destRegion = destRegion || `R${Math.floor(Math.random() * 30)}`;
        this.fragile = fragile || Math.random() < 0.1;
    }
}
