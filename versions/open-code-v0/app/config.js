const CONFIG = {
    // Canvas
    canvasWidth: 1400,
    canvasHeight: 720,

    // Docks
    numUnloadDocks: 10,
    numLoadDocks: 5,
    dockWidth: 90,
    dockHeight: 48,
    dockGap: 10,

    // Pockets (карманы)
    numPockets: 30,
    pocketCapacity: 500,
    pocketThreshold: 400,
    pocketCols: 3,
    pocketRows: 10,
    pocketWidth: 68,
    pocketHeight: 38,
    pocketGap: 8,

    // Buffers
    bufferCapacity: 2000,
    reserveBufferCapacity: 3000,

    // Conveyor
    conveyorSpeed: 35000,

    // Incoming flow
    incomingIntensity: 2000,
    palletRatio: 0.2,
    autoUnloadRatio: 0.7,
    itemRatio: 0.05,

    // Workers
    autoUnloadWorkers: 3,
    manualUnloadWorkers: 5,
    depalletizerOperators: 2,
    loadWorkers: 4,

    // Layout positions (computed for convenience)
    docksStartX: 30,
    docksStartY: 35,

    bufferX: 180,
    bufferY: 260,
    bufferW: 130,
    bufferH: 200,

    conveyorCx: 600,
    conveyorCy: 360,
    conveyorRx: 220,
    conveyorRy: 180,

    pocketsStartX: 950,
    pocketsStartY: 105,
};
