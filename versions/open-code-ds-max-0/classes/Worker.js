let nextId = 1;

export class Worker {
    constructor(role, speed) {
        this.id = nextId++;
        this.role = role;
        this.speed = speed;
        this.currentTask = null;
        this.busy = false;
        this.totalProcessed = 0;
    }

    assignTask(task) {
        this.currentTask = task;
        this.busy = true;
    }

    completeTask() {
        this.currentTask = null;
        this.busy = false;
    }
}

export function resetWorkerId() { nextId = 1; }
