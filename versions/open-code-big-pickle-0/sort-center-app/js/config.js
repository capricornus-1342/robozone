const CONFIG = {
  simulation: {
    tickInterval: 50,
    speedMultiplier: 1,
    maxParcels: 500,
  },

  building: {
    width: 1200,
    height: 700,
    columns: false,
    ceilingHeight: 18,
  },

  loopConveyor: {
    segments: 20,
    speed: 2,
    spacing: 30,
    radiusX: 300,
    radiusY: 200,
    centerX: 600,
    centerY: 350,
  },

  exits: {
    count: 12,
    capacity: 8,
    bufferSize: 5,
    pushSpeed: 1,
    fragilePushSpeed: 0.5,
  },

  inbound: {
    dockCount: 4,
    parcelsPerMinute: 60,
    scannerTime: 100,
    bufferCapacity: 20,
  },

  outbound: {
    dockCount: 4,
    loadTime: 200,
    maxDistance: 30,
  },

  faultTolerance: {
    backupMotor: true,
    backupServer: true,
    backupScanners: 2,
    congestionThreshold: 3000,
    bypassExits: 2,
  },

  regions: [
    { id: 'north', name: 'Северный', color: '#4A90D9', exits: [0, 1, 2] },
    { id: 'south', name: 'Южный', color: '#D94A4A', exits: [3, 4, 5] },
    { id: 'east', name: 'Восточный', color: '#4AD94A', exits: [6, 7, 8] },
    { id: 'west', name: 'Западный', color: '#D9C24A', exits: [9, 10, 11] },
  ],
};
