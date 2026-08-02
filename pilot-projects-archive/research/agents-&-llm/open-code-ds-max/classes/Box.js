let nextId = 1;

export class Box {
    constructor(weight, destRegion) {
        this.id = nextId++;
        this.weight = weight;
        this.destRegion = destRegion;
        this.isOnPallet = false;
    }
}

export function resetBoxId() { nextId = 1; }
