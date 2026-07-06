class Truck {
    static nextId = 1;

    constructor(numBoxes) {
        this.id = Truck.nextId++;
        this.type = 'incoming';
        this.boxes = [];
        this.arrivalTime = null;

        for (let i = 0; i < numBoxes; i++) {
            this.boxes.push(new Box());
        }
    }

    get numBoxes() {
        return this.boxes.length;
    }
}
