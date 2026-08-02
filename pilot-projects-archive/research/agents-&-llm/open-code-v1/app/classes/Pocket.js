class Pocket {
    constructor(id, region, capacity) {
        this.id = id;
        this.region = region;
        this.capacity = capacity;
        this.boxes = [];
    }

    addBox(box) {
        if (this.boxes.length < this.capacity) {
            this.boxes.push(box);
            return true;
        }
        return false;
    }

    get count() {
        return this.boxes.length;
    }

    get fillRate() {
        return this.boxes.length / this.capacity;
    }

    get isFull() {
        return this.boxes.length >= this.capacity;
    }
}
