// Файл параметров модели
export const config = {
    // Размеры
    canvasWidth: 1200,
    canvasHeight: 800,

    // Количество сущностей
    numUnloadDocks: 10,
    numLoadDocks: 5,
    numPockets: 30,
    
    // Вместимость
    pocketCapacity: 500,       // коробок
    pocketShipmentThreshold: 400, // коробок
    intermediateBufferCapacity: 2000, // коробок
    reserveBufferCapacity: 3000, // коробок

    // Скорости и производительность
    autoUnloadSpeed: 3000,       // коробок/час
    manualUnloadSpeedPerWorker: 400, // коробок/час на человека
    sortingConveyorSpeed: 35000,  // коробок/час
    truckLoadTimePerBox: 10,      // секунд на коробку
    documentProcessingTime: 5 * 60, // секунд
    palletProcessingTime: 10 * 60, // секунд на паллету (среднее)

    // Персонал
    numAutoUnloadWorkers: 3,
    numManualUnloadWorkers: 5,
    numDepalletizerOperators: 2,
    numLoadWorkers: 4,

    // Потоки
    incomingFlowIntensity: 2000, // коробок/час (средняя)
    palletShare: 0.20,           // 20%
    autoUnloadShare: 0.70,       // 70%
    itemShare: 0.05,             // 5%

    // Время симуляции
    simulationDuration: Infinity, // в секундах
    balanceCheckInterval: 10 * 60, // каждые 10 минут модельного времени

    // Визуализация
    colors: {
        dock: '#aaa',
        dockBusy: '#f00',
        conveyor: '#666',
        buffer: '#add8e6',
        pocket: '#d3d3d3',
        box: '#ffa500',
        pallet: '#8b4513',
        item: '#ffc0cb',
        worker: '#00f'
    }
};
