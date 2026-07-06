import { generateId } from "../utils.js";

export class Buffer {
    constructor({ id, maxCapacity }) {
        this.id = id;
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
        return this.items.shift();
    }
    
    isFull() {
        return this.items.length >= this.maxCapacity;
    }
}
