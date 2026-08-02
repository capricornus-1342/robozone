let nextId = 1;

export class Item {
    constructor(weight, destRegion, fragile = false) {
        this.id = nextId++;
        this.weight = weight;
        this.destRegion = destRegion;
        this.fragile = fragile;
    }
}

export function resetItemId() { nextId = 1; }
