let nextId = 1;

export class Pocket {
    constructor(region, capacity, threshold) {
        this.id = nextId++;
        this.region = region;
        this.capacity = capacity;
        this.boxes = [];
        this.threshold = threshold;
    }

    addBox(box) {
        if (this.boxes.length < this.capacity) {
            this.boxes.push(box);
            return true;
        }
        return false;
    }

    isReadyToShip() {
        return this.boxes.length >= this.threshold;
    }

    clear() {
        const shipped = this.boxes;
        this.boxes = [];
        return shipped;
    }
}

export function resetPocketId() { nextId = 1; }
