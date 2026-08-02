let nextId = 1;

export class ConveyorBelt {
    constructor(speed, maxBuffer = 200) {
        this.id = nextId++;
        this.speed = speed;
        this.buffer = [];
        this.maxBuffer = maxBuffer;
    }

    process() {
        if (this.buffer.length > 0) {
            return this.buffer.shift();
        }
        return null;
    }

    addBox(item) {
        if (this.buffer.length < this.maxBuffer) {
            this.buffer.push(item);
            return true;
        }
        return false;
    }
}

export function resetConveyorBeltId() { nextId = 1; }
