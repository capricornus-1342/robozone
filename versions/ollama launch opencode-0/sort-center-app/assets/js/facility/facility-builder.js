/**
 * Facility = the whole sorting center as a composition of all parts.
 * Knows geometry, builds the world given a scenario configuration.
 */
import { Conveyor } from '../infrastructure/conveyors/conveyor.js';
import { Scanner } from '../infrastructure/scanners/scanner.js';
import { Sorter } from '../infrastructure/sorters/sorter.js';
import { Chute } from '../infrastructure/chutes/chute.js';
import { Dock } from '../infrastructure/docks/dock.js';
import { Destination } from '../domain/destinations/destination.js';
import { InboundZone } from '../zones/inbound-zone.js';
import { InductionZone } from '../zones/induction-zone.js';
import { SortationLoop } from '../zones/sortation-loop.js';
import { OutboundZone } from '../zones/outbound-zone.js';
import { WCSController } from '../control/wcs.js';
import { MetricsCollector } from '../analytics/metrics.js';

/**
 * Build a sorting center configuration.
 * Geometry: 1000x600 canvas. Building in center; inbound docks top, outbound bottom.
 * Main loop is a horizontal ring through the middle.
 */
export function buildFacility({ engine, config }) {
  const metrics = new MetricsCollector();

  // Destinations
  const destinations = config.destinations.map(d =>
    new Destination({ name: d.name, region: d.region, code: d.code, weight: d.weight })
  );

  // Chutes arranged along bottom of loop, evenly spaced
  const chutes = [];
  const sorters = [];
  const loopY = 320;
  const loopLeftX = 120;
  const loopRightX = 880;
  const loopTopY = 160;
  const chuteY = loopY + 80;
  const chuteCount = config.chuteCount;
  const span = loopRightX - loopLeftX - 80;
  for (let i = 0; i < chuteCount; i++) {
    const x = loopLeftX + 40 + (span * (i + 0.5) / chuteCount);
    const dest = destinations[i % destinations.length];
    const chute = new Chute({
      name: `Chute ${i + 1}`,
      destination: dest.id,
      capacity: 8,
      x, y: chuteY
    });
    chutes.push(chute);
    dest.attachChute(chute.id);
    sorters.push(new Sorter({ chuteId: chute.id, loop: null, force: 0.9 }));
  }

  // Loop conveyor — represented as a "ring" polyline
  const loopConveyor = new Conveyor({
    name: 'Главная петля',
    length: 2 * (loopRightX - loopLeftX) + 2 * (loopY - loopTopY),
    speed: 5.0, // 5 m/s on canvas scale
    capacity: 60,
    dualDrive: true,
    layout: 'loop',
    points: [
      { x: loopLeftX, y: loopTopY },
      { x: loopRightX, y: loopTopY },
      { x: loopRightX, y: loopY },
      { x: loopLeftX, y: loopY }
    ]
  });

  // Induction conveyor from inbound → loop
  const inductionConveyor = new Conveyor({
    name: 'Индукция',
    length: 100,
    speed: 4.0,
    capacity: 8,
    layout: 'straight',
    points: [
      { x: 60, y: loopTopY - 30 },
      { x: loopLeftX, y: loopTopY - 30 }
    ]
  });

  // Scanner at induction end
  const scanner = new Scanner({
    name: 'Главный сканер',
    position: { x: loopLeftX - 10, y: loopTopY - 30 }
  });

  // Docks: inbound top side, outbound bottom
  const inboundDocks = [];
  const inboundDockCount = config.inboundDockCount || 6;
  for (let i = 0; i < inboundDockCount; i++) {
    const x = loopLeftX + 40 + (span * (i + 0.5) / inboundDockCount);
    inboundDocks.push(new Dock({
      side: 'inbound',
      position: { x, y: loopTopY - 80 },
      label: `IN-${i + 1}`
    }));
  }
  const outboundDocks = [];
  const outboundDockCount = config.outboundDockCount || 6;
  for (let i = 0; i < outboundDockCount; i++) {
    const x = loopLeftX + 40 + (span * (i + 0.5) / outboundDockCount);
    outboundDocks.push(new Dock({
      side: 'outbound',
      position: { x, y: loopY + 130 },
      label: `OUT-${i + 1}`
    }));
  }

  // WCS
  const wcs = new WCSController({
    destinations,
    chutes,
    sorters,
    metrics,
    onAssignment: (p, c) => { p.route.push(`chute:${c.id}`); }
  });

  // Zones
  const inboundZone = new InboundZone({
    engine,
    metrics,
    destinations,
    arrivalRate: config.arrivalRate || 1.2,
    truckArrivalInterval: 25,
    capacity: 300
  });
  const inductionZone = new InductionZone({
    engine, inbound: inboundZone, sortationLoop: null, metrics, inductionInterval: 0.4
  });
  const sortationLoop = new SortationLoop({
    engine, loopConveyor, scanner, chutes, sorters, wcs, metrics
  });
  // Bind induction → sortation loop
  inductionZone.sortationLoop = sortationLoop;
  const outboundZone = new OutboundZone({
    engine, chutes, destinations, outboundDocks, metrics, loadInterval: 2.0
  });

  return {
    destinations,
    chutes,
    sorters,
    loopConveyor,
    inductionConveyor,
    scanner,
    inboundDocks,
    outboundDocks,
    wcs,
    metrics,
    inboundZone,
    inductionZone,
    sortationLoop,
    outboundZone
  };
}
