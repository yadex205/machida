import {
  parseEventInformationSectionBody,
  parseDescriptors,
  parseComponentDescriptorBody,
  parseContentDescriptorBody,
  parseEventGroupDescriptorBody,
  parseShortEventDescriptorBody,
  ExtendedEventDescriptorProcessor,
} from 'arib-b10';

import { databases } from '../db';

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

const eventsCollection =
  databases.epg.getCollection<Event>('event') ||
  databases.epg.addCollection<Event>('event', {
    indices: ['serviceId', 'eventId'],
  });

export const getAllEvents = () => {
  return eventsCollection.data;
};

export const saveEventsFromEventInformationSection = (...args: Parameters<typeof parseEventInformationSectionBody>) => {
  const { originalNetworkId, transportStreamId, serviceId, events } = parseEventInformationSectionBody(...args);
  const extendedEventDescriptorProcessor = new ExtendedEventDescriptorProcessor();

  for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
    const { eventId, startTime, duration, descriptors: _descriptors } = events[eventIndex];
    const descriptors = parseDescriptors(_descriptors);

    const eventDoc: Event = {
      originalNetworkId,
      transportStreamId,
      serviceId,
      eventId,
      startTime,
      duration,
      name: {},
      summary: {},
      details: {},
      additionalDescription: {},
      components: [],
      genres: [],
      eventGroups: [],
    };

    for (let descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex++) {
      const descriptor = descriptors[descriptorIndex];

      if (descriptor.tag === 0x4d) {
        const { iso639LanguageCode, eventName, text } = parseShortEventDescriptorBody(descriptor);
        eventDoc.name[iso639LanguageCode] = eventName;
        eventDoc.summary[iso639LanguageCode] = text;
      } else if (descriptor.tag === 0x4e) {
        const extendedEventDescriptor = extendedEventDescriptorProcessor.feed(descriptor);
        if (extendedEventDescriptor) {
          const { iso639LanguageCode, items, text } = extendedEventDescriptor;
          if (!eventDoc.details[iso639LanguageCode]) {
            eventDoc.details[iso639LanguageCode] = [];
          }
          items.forEach(({ itemDescription, item }) => {
            eventDoc.details[iso639LanguageCode].push({ subject: itemDescription, content: item });
          });
          eventDoc.additionalDescription[iso639LanguageCode] = text;
        }
      } else if (descriptor.tag === 0x50) {
        const { streamContent, componentType, componentTag, iso639LanguageCode, text } =
          parseComponentDescriptorBody(descriptor);
        const existingComponent = eventDoc.components.find(
          c => c.streamContent === streamContent && c.componentType === componentType && c.componentTag === componentTag
        );
        if (existingComponent) {
          existingComponent.texts[iso639LanguageCode] = text;
        } else {
          eventDoc.components.push({
            streamContent,
            componentType,
            componentTag,
            texts: { [iso639LanguageCode]: text },
          });
        }
      } else if (descriptor.tag === 0x54) {
        const { items } = parseContentDescriptorBody(descriptor);
        items.forEach(({ contentNibbleLevel1, contentNibbleLevel2 }) => {
          eventDoc.genres.push({ genre: contentNibbleLevel1, subGenre: contentNibbleLevel2 });
        });
      } else if (descriptor.tag === 0xd6) {
        const { groupType: type, events, networkEvents } = parseEventGroupDescriptorBody(descriptor);
        eventDoc.eventGroups.push({ type, events, networkEvents });
      }
    }

    const prevEventDoc = eventsCollection.findOne({
      originalNetworkId: { $eq: originalNetworkId },
      transportStreamId: { $eq: transportStreamId },
      serviceId: { $eq: serviceId },
      eventId: { $eq: eventId },
    });

    if (prevEventDoc) {
      eventsCollection.update({ ...prevEventDoc, ...eventDoc });
    } else {
      eventsCollection.insert(eventDoc);
    }
  }
};
