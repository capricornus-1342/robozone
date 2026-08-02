import { generateId } from "../utils.js";
import { Pallet, Box, Item } from "./index.js";

export class Truck {
    constructor({ type, config }) {
        this.id = generateId('truck');
        this.type = type; // 'incoming' или 'outgoing'
        this.load = [];
        this.arrivalTime = null;
        this.scheduledTime = null;

        if (this.type === 'incoming' && config) {
            this.generateLoad(config);
        } else {
            this.capacity = 100; // Для исходящих
            this.destRegion = null;
        }
    }
    
    generateLoad(config) {
        const totalItems = config.incomingFlowIntensity / (3600 / (15 * 60)); // Примерно грузовик каждые 15 мин
        let itemsCount = 0;
        
        while(itemsCount < totalItems) {
            const rand = Math.random();
            if (rand < config.palletShare) {
                const pallet = new Pallet({});
                this.load.push(pallet);
                itemsCount += pallet.numBoxes;
            } else if (rand < config.palletShare + config.itemShare) {
                this.load.push(new Item({}));
                itemsCount += 1;
            } else {
                this.load.push(new Box({}));
                itemsCount += 1;
            }
        }
    }

    unload() {
        return this.load.pop();
    }

    loadBoxes(boxes) {
        this.load.push(...boxes);
    }

    depart() {
        // Логика отправления
    }
}
