import Loki from 'lokijs';

const machidaDb = new Loki('machida');

export interface Event {
  serviceId: number;
  eventId: number;
  schedule: {
    start: Date | undefined;
    duration: number | undefined;
  };
  name: Record<string, string>;
  summary: Record<string, string>;
  detail: Record<string, { subject: string; content: string }[]>;
  additionalDescription: Record<string, string>;
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
  printEvents: () => {
    const eventRecords = events.data;
    console.table(eventRecords, ['serviceId', 'eventId', 'schedule', 'name']);
  },
};
