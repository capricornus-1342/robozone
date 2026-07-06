# Session Context — Sorting Center Simulation

## Goal
Create an interactive HTML+JS simulation of a sorting center with balancing, visualization, and statistics, following the step-by-step plan in `skill-plan.md`. All project files are in the `app/` subdirectory.

## Project Structure
```
app/
├── index.html                  # Page skeleton, script loading order
├── style.css                   # Styling
├── config.js                   # All dimensions and parameters
├── app.js                      # simState, render orchestration, button handlers, engine wiring
├── visualization.js            # Canvas drawing (docks, buffer, conveyor, pockets, chutes, dots)
├── classes/
│   ├── Box.js                  # Box with id, weight, destRegion
│   ├── Truck.js                # Truck with id, boxes[], numBoxes
│   ├── Pocket.js               # Pocket with id, region, capacity, boxes[]
│   └── SimulationEngine.js     # DES engine with scheduleEvent/step/loop, 3 event types
├── skill.md                    # Full spec (13 requirements, entity classes, layout, balancing)
├── skill-plan.md               # Sequential implementation plan (13 stages)
```

## Script Load Order (index.html)
1. config.js → 2. Box.js → 3. Truck.js → 4. Pocket.js → 5. visualization.js → 6. SimulationEngine.js → 7. app.js

## Architecture & Key Decisions

### Layout
- 10 unloading docks on the left (vertical stack), 1 buffer rectangle in center-left
- Elliptical ring conveyor (cx:600, cy:360, rx:220, ry:180) in the center
- 30 pockets in a 3 column × 10 row grid on the right (predominantly vertical for uniform distance from conveyor)
- Each pocket has a UNIQUE connection point on the right half of the conveyor ellipse (distributed evenly from top to bottom) — reflects real individual diverters
- Chute lines are dashed with arrowheads pointing to pockets

### Simulation Engine
- Discrete Event Simulation (DES) with time-sorted event queue
- Events: `ARRIVAL_TRUCK`, `UNLOAD_COMPLETE`, `CONVEYOR_FEED`
- Main loop uses `requestAnimationFrame` with accumulator-based stepping
- Speed multiplier (1x–10x) from slider
- When buffer is full, `UNLOAD_COMPLETE` retries after 1–2 seconds (truck waits at dock)

### Box Flow
1. `ARRIVAL_TRUCK`: creates Truck with 20–100 Box objects, assigns to free dock, schedules UNLOAD_COMPLETE after 1.5–4.0s
2. `UNLOAD_COMPLETE`: if buffer has space, transfers boxes from truck to buffer, frees dock
3. `CONVEYOR_FEED`: every 0.3–0.6s, moves 10–25 boxes from buffer to conveyor as orange dots
4. Dots animate along the elliptical conveyor (progress 0→1, speed 0.12–0.20 per sim-second)
5. When dot.progress >= 1, creates a Box and adds it to the randomly-assigned destPocket
6. **Important**: dot advancement and completed-dot transfer happen in `app.js` `render()`, NOT in visualization.js

### State Management
- `simState` in `app.js` holds: dockOccupied[], truckIds[], currentTrucks[], truckCounter, totalArrived, totalBoxesArrived, bufferCount, totalUnloaded, conveyorDots[], pockets[]
- `simState.pockets` initialized from `POCKET_REGIONS` array (30 Russian cities)
- `resetState()` clears all state including pocket boxes

### Logging
- All logs go to browser console (F12), not on-screen
- `logMessage()` function with timestamp
- Engine logs events with truck IDs, box counts, simulation time

### Pocket Rendering (Stage 5)
- Fill color: green→yellow→red gradient based on fillRate
- Region name (white text, top) and box count (white bold text, bottom)
- Full pockets reject new boxes (boxes are silently lost if pocket is full)

## Completed Stages

### Stage 0: Skeleton with Static Layout
- Created app/ directory, index.html, style.css, config.js, visualization.js, app.js
- 10 docks, buffer, elliptical conveyor, 3×10 pocket grid
- Unique chute lines from conveyor to each pocket

### Stage 1: Console Logging + Manual Events
- logMessage() via console.log
- "Сгенерировать событие" button triggers ARRIVAL_TRUCK, dock turns green

### Stage 2: SimulationEngine with DES
- scheduleEvent(), step(), run() with rAF loop
- ARRIVAL_TRUCK every 0.8–3.0s
- UNLOAD_COMPLETE after 1.5–4.0s with buffer overflow handling
- Dynamic buffer fill (green→yellow→red) with counter

### Stage 3: Box & Truck Classes
- Box: id, weight, destRegion
- Truck: id, type, boxes[], arrivalTime
- Status line shows box counts, dock label shows box count per truck

### Stage 4: Conveyor Animation
- CONVEYOR_FEED event every 0.3–0.6s moves 10–25 boxes from buffer to conveyor
- Orange dots animate along elliptical belt (progress-based)
- Dot speed: 0.12–0.20 per sim-second (full loop ≈ 5–8s at 1x)
- Conveyor dot counter in status line and below belt

### Stage 5: Pockets with Fill Visualization (current — COMPLETE)
- Pocket class with region, capacity, boxes[], fillRate, isFull
- 30 pockets from POCKET_REGIONS initialized in simState
- Each dot gets random destPocket on creation
- Dot advancement and completed-dot → pocket transfer in app.js render()
- Pocket rendering with fill color, region name, box count

## Current State (after Stage 5)
All 6 files in `app/` are updated and consistent. The simulation runs in browser:
- Trucks arrive → docks turn green → boxes go to buffer
- Conveyor feeds from buffer → dots move along belt
- Dots complete → boxes go to pockets → pockets change color

## Next Steps (unimplemented stages from skill-plan.md)
- Stage 6: Outgoing truck shipments from pockets (SHIPMENT_READY event)
- Stage 7: Pallet and item types with depalletizing zone
- Stage 8: WMS balancer/regulator logic
- Stage 9: Smooth chute animation from conveyor to pocket
- Stage 10: Statistics collector and charts
- Stage 11: Full UI polish
- Stage 12: Edge case testing
- Stage 13: Final polish and documentation

## Key File Contents (snapshot)

### app/config.js
```js
const CONFIG = {
    canvasWidth: 1400, canvasHeight: 720,
    numUnloadDocks: 10, numLoadDocks: 5,
    dockWidth: 90, dockHeight: 48, dockGap: 10,
    numPockets: 30, pocketCapacity: 500, pocketThreshold: 400,
    pocketCols: 3, pocketRows: 10, pocketWidth: 68, pocketHeight: 38, pocketGap: 8,
    bufferCapacity: 2000, reserveBufferCapacity: 3000,
    conveyorSpeed: 35000,
    incomingIntensity: 2000, palletRatio: 0.2, autoUnloadRatio: 0.7, itemRatio: 0.05,
    autoUnloadWorkers: 3, manualUnloadWorkers: 5, depalletizerOperators: 2, loadWorkers: 4,
    docksStartX: 30, docksStartY: 35,
    bufferX: 180, bufferY: 260, bufferW: 130, bufferH: 200,
    conveyorCx: 600, conveyorCy: 360, conveyorRx: 220, conveyorRy: 180,
    pocketsStartX: 950, pocketsStartY: 105,
};
```

### app/classes/Box.js
```js
class Box {
    static nextId = 1;
    constructor() {
        this.id = Box.nextId++;
        this.weight = 0.5 + Math.random() * 5;
        this.destRegion = null;
        this.isOnPallet = false;
    }
}
```

### app/classes/Truck.js
```js
class Truck {
    static nextId = 1;
    constructor(numBoxes) {
        this.id = Truck.nextId++;
        this.type = 'incoming';
        this.boxes = [];
        this.arrivalTime = null;
        for (let i = 0; i < numBoxes; i++) this.boxes.push(new Box());
    }
    get numBoxes() { return this.boxes.length; }
}
```

### app/classes/Pocket.js
```js
class Pocket {
    constructor(id, region, capacity) {
        this.id = id; this.region = region; this.capacity = capacity; this.boxes = [];
    }
    addBox(box) {
        if (this.boxes.length < this.capacity) { this.boxes.push(box); return true; }
        return false;
    }
    get count() { return this.boxes.length; }
    get fillRate() { return this.boxes.length / this.capacity; }
    get isFull() { return this.boxes.length >= this.capacity; }
}
```

### app/classes/SimulationEngine.js
Key methods:
- `scheduleEvent(event, delay)` — pushes to queue sorted by time
- `step()` — pops next event, advances sim time, processes it
- `processEvent(event)` — routes to handleArrival/handleUnloadComplete/handleConveyorFeed
- `handleArrival` — creates Truck, assigns dock, schedules UNLOAD_COMPLETE, reschedules ARRIVAL_TRUCK
- `handleUnloadComplete` — checks buffer space, retries if full, transfers boxes if free
- `handleConveyorFeed` — moves 10–25 from buffer to conveyorDots with random destPocket
- `start()` — sets up first events if queue empty, begins rAF loop with accumulator
- `loop()` — rAF loop, accumulates dt × speed, processes events in sim-time steps, calls onUpdate
- `pause()`, `reset()` — lifecycle management

### app/app.js
```js
// POCKET_REGIONS: 30 Russian cities
// simState: dockOccupied[10], truckIds[10], currentTrucks[10], counters, conveyorDots[], pockets[]
// render(simDt): advances dots, transfers completed to pockets, calls drawLayout
// Button handlers: Start, Pause, Reset, Event button, Speed slider
// Engine: new SimulationEngine(CONFIG, simState, { onLog, onUpdate })
```

### app/visualization.js
Function `drawLayout(ctx, config, state, simDt)`:
- Clears canvas, draws background
- Status line at top: counts for trucks, boxes, unloaded, buffer, conveyor
- Section labels
- 10 unloading docks (blue empty, green when occupied, shows truck ID + box count)
- Buffer with fill indicator (green→yellow→red), counter
- Elliptical conveyor ring with dashed center line, direction arrows
- Orange dots at positions based on progress
- Conveyor dot counter below ellipse
- 30 pockets with fill color, region name, box count
- Connection lines (dashed chutes) from unique conveyor points to each pocket with arrowheads
- Reserve buffer placeholder at bottom

### app/index.html
- Title, canvas, control panel (Start, Pause, Reset, Event, Save buttons + speed slider)
- Script loading order as listed above
- No on-screen log area (logs go to console)

### app/style.css
- White card container, centered layout
- Button styles (green start, orange pause, red reset, blue save, purple event)
- Disabled button states, range slider styling
