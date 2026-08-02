export const Config = {
    simulation: {
        tickRate: 60,
        defaultSpeed: 3,
        maxSpeed: 10,
    },

    building: {
        width: 900,
        height: 500,
        wallColor: '#1a2332',
        floorColor: '#0d1321',
        wallThickness: 3,
    },

    conveyor: {
        speed: 2.0,
        beltWidth: 14,
        color: '#37474f',
        beltColor: '#546e7a',
        loopPaddingX: 160,
        loopPaddingY: 80,
        cornerRadius: 40,
    },

    parcel: {
        size: 10,
        colors: {
            standard: '#42a5f5',
            large: '#ffa726',
            fragile: '#ef5350',
        },
        glowIntensity: 0.6,
    },

    scanner: {
        size: 18,
        color: '#26a69a',
        scanRadius: 24,
        scanColor: 'rgba(38, 166, 154, 0.3)',
        scanDuration: 0.4,
    },

    dock: {
        width: 50,
        height: 28,
        inboundColor: '#2e7d32',
        outboundColor: '#c62828',
        truckColor: '#455a64',
        truckWidth: 44,
        truckHeight: 22,
    },

    exitPocket: {
        width: 30,
        height: 20,
        colors: {
            active: '#1b5e20',
            fault: '#b71c1c',
            bufferFull: '#e65100',
        },
        divertSpeed: 0.8,
    },

    buffer: {
        capacity: 8,
        width: 36,
        height: 12,
        fillColor: '#1a2332',
        borderColor: '#37474f',
        fullColor: '#e65100',
    },

    regions: [
        { id: 'msk', name: 'Москва', color: '#42a5f5', parcels: 0 },
        { id: 'spb', name: 'СПб', color: '#66bb6a', parcels: 0 },
        { id: 'ural', name: 'Урал', color: '#ffa726', parcels: 0 },
        { id: 'sib', name: 'Сибирь', color: '#ab47bc', parcels: 0 },
        { id: 'south', name: 'Юг', color: '#ef5350', parcels: 0 },
        { id: 'volga', name: 'Поволжье', color: '#26c6da', parcels: 0 },
        { id: 'nw', name: 'СЗ', color: '#8d6e63', parcels: 0 },
        { id: 'far_east', name: 'ДВ', color: '#78909c', parcels: 0 },
    ],

    fault: {
        probability: 0.002,
        duration: { min: 3, max: 8 },
    },

    arrival: {
        defaultRate: 8,
    },
};
