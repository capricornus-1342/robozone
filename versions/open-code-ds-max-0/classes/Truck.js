let nextId = 1;

export class Truck {
    constructor(type, capacity, destRegion) {
        this.id = nextId++;
        this.type = type;
        this.load = [];
        this.arrivalTime = 0;
        this.scheduledTime = 0;
        this.capacity = capacity;
        this.destRegion = destRegion;
    }

    unload() {
        const items = this.load;
        this.load = [];
        return items;
    }

    load(boxes) {
        this.load.push(...boxes);
    }

    depart() {
        const items = this.load;
        this.load = [];
        return items;
    }
}

export function resetTruckId() { nextId = 1; }
