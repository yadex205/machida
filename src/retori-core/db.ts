import Loki from 'lokijs';

import { AribEvent } from './models/arib-event';
import { AribNetwork } from './models/arib-network';
import { AribService } from './models/arib-service';

const _epgDatabase = new Loki('retori-epg');
const aribEvents =
  _epgDatabase.getCollection<AribEvent>('arib-events') ||
  _epgDatabase.addCollection<AribEvent>('arib-events', {
    indices: ['serviceId', 'eventId'],
  });
const aribNetworks =
  _epgDatabase.getCollection<AribNetwork>('arib-networks') ||
  _epgDatabase.addCollection<AribNetwork>('arib-networks', {
    indices: ['networkId'],
  });
const aribServices =
  _epgDatabase.getCollection<AribService>('arib-services') ||
  _epgDatabase.addCollection<AribService>('arib-services', {
    indices: ['serviceId'],
  });

export const epgDatabase = {
  aribEvents,
  aribNetworks,
  aribServices,
};
