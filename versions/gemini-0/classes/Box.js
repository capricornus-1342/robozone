import { generateId } from "../utils.js";

// Класс для базовых сущностей
export class Box {
    constructor({ weight, destRegion }) {
        this.id = generateId('box');
        this.weight = weight || Math.random() * 20 + 1;
        this.destRegion = destRegion || `R${Math.floor(Math.random() * 30)}`;
        this.isOnPallet = false;
    }
}
