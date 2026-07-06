let nextId = 1;

export class Buffer {
    constructor(maxCapacity) {
        this.id = nextId++;
        this.maxCapacity = maxCapacity;
        this.items = [];
    }

    add(item) {
        if (this.items.length < this.maxCapacity) {
            this.items.push(item);
            return true;
        }
        return false;
    }

    remove() {
        return this.items.shift() || null;
    }

    get fillLevel() {
        return this.maxCapacity > 0 ? this.items.length / this.maxCapacity : 0;
    }
}

export function resetBufferId() { nextId = 1; }
