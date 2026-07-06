let nextId = 1;

export class Dock {
    constructor(type) {
        this.id = nextId++;
        this.type = type;
        this.currentTruck = null;
        this.queue = [];
        this.busy = false;
        this.totalProcessed = 0;
    }

    assignTruck(truck) {
        if (this.currentTruck) {
            this.queue.push(truck);
            return false;
        }
        this.currentTruck = truck;
        this.busy = true;
        return true;
    }

    free() {
        const processed = this.currentTruck;
        this.currentTruck = null;
        this.busy = false;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            this.assignTruck(next);
            return next;
        }
        return null;
    }
}

export function resetDockId() { nextId = 1; }
