import Loki from 'lokijs';

const machidaDb = new Loki('machida');

type Iso639Alpha3Code = string;

export interface Event {
  serviceId: number;
  eventId: number;
  schedule: {
    start: Date | undefined;
    duration: number | undefined;
  };
  name: Record<Iso639Alpha3Code, string>;
  summary: Record<Iso639Alpha3Code, string>;
  detail: Record<Iso639Alpha3Code, { subject: string; content: string }[]>;
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

const events = machidaDb.addCollection<Event>('events', {
  indices: ['serviceId', 'eventId'],
});

export const db = {
  events,
};
