import { generateId } from "../utils.js";

export class Worker {
    constructor({ role, speed }) {
        this.id = generateId('worker');
        this.role = role; // 'unloader', 'depalletizer', 'loader', и т.д.
        this.speed = speed; // Индивидуальная производительность (если применимо)
        this.currentTask = null;
        this.isBusy = false;
    }

    assignTask(task) {
        this.currentTask = task;
        this.isBusy = true;
        // console.log(`Worker ${this.id} (${this.role}) assigned to ${task.type}`);
    }

    completeTask() {
        // console.log(`Worker ${this.id} (${this.role}) completed ${this.currentTask.type}`);
        const completedTask = this.currentTask;
        this.currentTask = null;
        this.isBusy = false;
        return completedTask;
    }
}
