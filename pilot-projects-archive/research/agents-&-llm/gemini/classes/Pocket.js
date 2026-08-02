import { generateId } from "../utils.js";

export class Pocket {
    constructor({ id, region, capacity, threshold }) {
        this.id = id;
        this.region = region;
        this.capacity = capacity;
        this.threshold = threshold;
        this.boxes = [];
    }

    addBox(box) {
        if (this.boxes.length < this.capacity) {
            this.boxes.push(box);
            return true;
        }
        return false; // Карман полон
    }

    isReadyToShip() {
        return this.boxes.length >= this.threshold;
    }

    getShipment() {
        // Возвращаем часть коробок, например, все что есть, если они готовы
        if (this.isReadyToShip()) {
             const shipment = this.boxes.splice(0, this.threshold);
             return shipment;
        }
        return [];
    }
}
