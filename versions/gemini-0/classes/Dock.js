import { generateId } from "../utils.js";

export class Dock {
    constructor({ id, type }) {
        this.id = id;
        this.type = type; // 'unload' или 'load'
        this.currentTruck = null;
        this.queue = [];
        this.isBusy = false;
    }

    assignTruck(truck) {
        if (!this.isBusy) {
            this.currentTruck = truck;
            this.isBusy = true;
            return true;
        }
        this.queue.push(truck);
        return false;
    }

    free() {
        const freedTruck = this.currentTruck;
        this.currentTruck = null;
        this.isBusy = false;
        
        // Взять следующий из очереди, если есть
        if (this.queue.length > 0) {
            const nextTruck = this.queue.shift();
            this.assignTruck(nextTruck);
            return { freedTruck, nextTruck };
        }
        return { freedTruck, nextTruck: null };
    }
}
