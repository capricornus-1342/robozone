class Box {
    static nextId = 1;

    constructor() {
        this.id = Box.nextId++;
        this.weight = 0.5 + Math.random() * 5;
        this.destRegion = null;
        this.isOnPallet = false;
    }
}
