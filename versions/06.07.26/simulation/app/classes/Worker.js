class Worker {
  constructor(id, role, speed) {
    this.id = id;
    this.role = role;
    this.speed = speed;
    this.currentTask = null;
    this.busy = false;
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
