/**
 * Scenario = preset configuration & event sequence.
 * Defines arrival rate, destinations, fault events to inject.
 */
export const SCENARIOS = {
  normal: {
    name: 'Обычный рабочий день',
    description: 'Базовый поток 1.2 посылки/сек, без сбоев.',
    arrivalRate: 1.2,
    destinations: [
      { name: 'Москва',     region: 'Центр',  code: 'MSK', weight: 0.30 },
      { name: 'СПб',        region: 'СЗ',     code: 'SPB', weight: 0.20 },
      { name: 'Казань',     region: 'Поволжье', code: 'KZN', weight: 0.10 },
      { name: 'Екатеринбург', region: 'Урал', code: 'EKB', weight: 0.10 },
      { name: 'Новосибирск', region: 'Сибирь', code: 'NSK', weight: 0.10 },
      { name: 'Краснодар',  region: 'Юг',     code: 'KRD', weight: 0.10 },
      { name: 'Владивосток', region: 'ДВ',    code: 'VVO', weight: 0.10 }
    ],
    chuteCount: 14,
    inboundDockCount: 6,
    outboundDockCount: 6,
    events: []
  },

  peak: {
    name: 'Чёрная пятница (пик)',
    description: 'Поток x3, рекордные объёмы. Проверка масштабируемости.',
    arrivalRate: 3.6,
    destinations: [
      { name: 'Москва',     region: 'Центр',  code: 'MSK', weight: 0.32 },
      { name: 'СПб',        region: 'СЗ',     code: 'SPB', weight: 0.18 },
      { name: 'Казань',     region: 'Поволжье', code: 'KZN', weight: 0.08 },
      { name: 'Екатеринбург', region: 'Урал', code: 'EKB', weight: 0.10 },
      { name: 'Новосибирск', region: 'Сибирь', code: 'NSK', weight: 0.10 },
      { name: 'Краснодар',  region: 'Юг',     code: 'KRD', weight: 0.12 },
      { name: 'Владивосток', region: 'ДВ',    code: 'VVO', weight: 0.10 }
    ],
    chuteCount: 14,
    inboundDockCount: 8,
    outboundDockCount: 8,
    events: [
      { at: 90,  type: 'surgeMoscow' },
      { at: 180, type: 'chuteJam' }
    ]
  },

  fault: {
    name: 'Отказ оборудования',
    description: 'Через 60с ломается один из сканеров, через 120с — затор в жёлобе.',
    arrivalRate: 1.5,
    destinations: [
      { name: 'Москва',     region: 'Центр',  code: 'MSK', weight: 0.30 },
      { name: 'СПб',        region: 'СЗ',     code: 'SPB', weight: 0.20 },
      { name: 'Казань',     region: 'Поволжье', code: 'KZN', weight: 0.10 },
      { name: 'Екатеринбург', region: 'Урал', code: 'EKB', weight: 0.10 },
      { name: 'Новосибирск', region: 'Сибирь', code: 'NSK', weight: 0.10 },
      { name: 'Краснодар',  region: 'Юг',     code: 'KRD', weight: 0.10 },
      { name: 'Владивосток', region: 'ДВ',    code: 'VVO', weight: 0.10 }
    ],
    chuteCount: 14,
    inboundDockCount: 6,
    outboundDockCount: 6,
    events: [
      { at: 60,  type: 'scannerFail' },
      { at: 120, type: 'chuteJam' },
      { at: 200, type: 'scannerRecover' }
    ]
  },

  bottleneck: {
    name: 'Узкое горлышко',
    description: 'Мало желобов (6) и мало доков → проверка устойчивости.',
    arrivalRate: 2.0,
    destinations: [
      { name: 'Москва',     region: 'Центр',  code: 'MSK', weight: 0.30 },
      { name: 'СПб',        region: 'СЗ',     code: 'SPB', weight: 0.20 },
      { name: 'Казань',     region: 'Поволжье', code: 'KZN', weight: 0.10 },
      { name: 'Екатеринбург', region: 'Урал', code: 'EKB', weight: 0.10 },
      { name: 'Новосибирск', region: 'Сибирь', code: 'NSK', weight: 0.10 },
      { name: 'Краснодар',  region: 'Юг',     code: 'KRD', weight: 0.10 },
      { name: 'Владивосток', region: 'ДВ',    code: 'VVO', weight: 0.10 }
    ],
    chuteCount: 6,
    inboundDockCount: 4,
    outboundDockCount: 4,
    events: []
  }
};
