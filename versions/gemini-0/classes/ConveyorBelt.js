import { generateId } from "../utils.js";

export class ConveyorBelt {
    constructor({ id, speed, maxBuffer }) {
        this.id = id;
        this.speed = speed; // коробок в час
        this.buffer = [];
        this.maxBuffer = maxBuffer || 100; // Установим значение по умолчанию
    }

    add(item) {
        if (!this.isFull()) {
            this.buffer.push(item);
            return true;
        }
        return false;
    }

    process(deltaTime) {
        const itemsToProcess = Math.floor(this.speed / 3600 * deltaTime);
        const processedItems = this.buffer.splice(0, itemsToProcess);
        return processedItems;
    }

    isFull() {
        return this.buffer.length >= this.maxBuffer;
    }
}
