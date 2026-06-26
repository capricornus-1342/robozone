/**
 * InductionZone: bridges inbound queue → main loop.
 * Pulls parcels from inbound at a fixed rate, then after a short
 * induction travel time, hands them to the SortationLoop's "incoming"
 * buffer where they enter the loop.
 */
export class InductionZone {
  constructor({ engine, inbound, sortationLoop, metrics, inductionInterval = 0.4 }) {
    this.engine = engine;
    this.inbound = inbound;
    this.sortationLoop = sortationLoop;
    this.metrics = metrics;
    this.inductionInterval = inductionInterval;
    this.inductionDelay = 0.6; // travel time in sim seconds
    this._scheduleNext();
  }

  _scheduleNext() {
    this.engine.schedule({
      delay: this.inductionInterval,
      type: 'induction:tick',
      handler: () => this._induct()
    });
  }

  _induct() {
    if (!this.engine.running) return;
    if (this.engine.paused) {
      this.engine.schedule({ delay: 0.2, type: 'induction:tick', handler: () => this._induct() });
      return;
    }
    const parcel = this.inbound.pull();
    if (parcel) {
      parcel.status = 'inducting';
      parcel.inductedAt = this.engine.time;
      // Hold in sortation loop's incoming buffer after the induction delay
      this.engine.schedule({
        delay: this.inductionDelay,
        type: 'induction:arriveAtLoop',
        payload: { parcel },
        handler: (p) => {
          if (this.engine.running && !this.engine.paused) {
            this.sortationLoop.acceptParcel(p.parcel);
          } else {
            // Put back if engine paused mid-flight — for simplicity drop
          }
        }
      });
      if (this.metrics) this.metrics.onParcelInducted(parcel);
    }
    this.engine.schedule({
      delay: this.inductionInterval,
      type: 'induction:tick',
      handler: () => this._induct()
    });
  }
}
