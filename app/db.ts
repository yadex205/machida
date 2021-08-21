import Loki from 'lokijs';

const machidaDb = new Loki('machida');

type Iso639Alpha3Code = string;

export interface Event {
  originalNetworkId: number;
  transportStreamId: number;
  serviceId: number;
  eventId: number;
  startTime: Date | undefined;
  duration: number | undefined;
  name: Record<Iso639Alpha3Code, string>;
  summary: Record<Iso639Alpha3Code, string>;
  details: Record<Iso639Alpha3Code, { subject: string; content: string }[]>;
  additionalDescription: Record<Iso639Alpha3Code, string>;
  components: {
    streamContent: number;
    componentType: number;
    componentTag: number;
    texts: Record<Iso639Alpha3Code, string>;
  }[];
  genres: { genre: number; subGenre: number }[];
  eventGroups: {
    type: number;
    events: { serviceId: number; eventId: number }[];
    networkEvents?: { originalNetworkId: number; transportStreamId: number; serviceId: number; eventId: number }[];
  }[];
}

export interface Service {
  originalNetworkId: number;
  transportStreamId: number;
  serviceId: number;
  name?: string;
  serviceType?: number;
  serviceProviderName?: string;
}

const events = machidaDb.addCollection<Event>('events', {
  indices: ['originalNetworkId', 'transportStreamId', 'serviceId', 'eventId'],
});

const services = machidaDb.addCollection<Service>('services', {
  indices: ['originalNetworkId', 'transportStreamId', 'serviceId'],
});

export const db = {
  events,
  services,
};
