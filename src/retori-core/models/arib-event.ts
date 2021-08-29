import {
  parseEventInformationSectionBody,
  parseDescriptors,
  parseComponentDescriptorBody,
  parseContentDescriptorBody,
  parseEventGroupDescriptorBody,
  parseShortEventDescriptorBody,
  ExtendedEventDescriptorProcessor,
} from 'arib-b10';

type Iso639Alpha3Code = string;

export interface AribEvent {
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

export const extractAribEventsFromEventInformationSection = (
  ...args: Parameters<typeof parseEventInformationSectionBody>
): AribEvent[] => {
  const result: AribEvent[] = [];

  const {
    originalNetworkId,
    transportStreamId,
    serviceId,
    events: eventsRawData,
  } = parseEventInformationSectionBody(...args);
  const extendedEventDescriptorProcessor = new ExtendedEventDescriptorProcessor();

  eventsRawData.forEach(({ eventId, startTime, duration, descriptors: descriptorsRawData }) => {
    const aribEvent: AribEvent = {
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

    parseDescriptors(descriptorsRawData).forEach(descriptor => {
      if (descriptor.tag === 0x4d) {
        const { iso639LanguageCode, eventName, text } = parseShortEventDescriptorBody(descriptor);
        aribEvent.name[iso639LanguageCode] = eventName;
        aribEvent.summary[iso639LanguageCode] = text;
      } else if (descriptor.tag === 0x4e) {
        const extendedEventDescriptor = extendedEventDescriptorProcessor.feed(descriptor);
        if (extendedEventDescriptor) {
          const { iso639LanguageCode, items, text } = extendedEventDescriptor;
          if (!aribEvent.details[iso639LanguageCode]) {
            aribEvent.details[iso639LanguageCode] = [];
          }
          items.forEach(({ itemDescription, item }) => {
            aribEvent.details[iso639LanguageCode].push({ subject: itemDescription, content: item });
          });
          aribEvent.additionalDescription[iso639LanguageCode] = text;
        }
      } else if (descriptor.tag === 0x50) {
        const { streamContent, componentType, componentTag, iso639LanguageCode, text } =
          parseComponentDescriptorBody(descriptor);
        const existingComponent = aribEvent.components.find(
          c => c.streamContent === streamContent && c.componentType === componentType && c.componentTag === componentTag
        );
        if (existingComponent) {
          existingComponent.texts[iso639LanguageCode] = text;
        } else {
          aribEvent.components.push({
            streamContent,
            componentType,
            componentTag,
            texts: { [iso639LanguageCode]: text },
          });
        }
      } else if (descriptor.tag === 0x54) {
        const { items } = parseContentDescriptorBody(descriptor);
        items.forEach(({ contentNibbleLevel1, contentNibbleLevel2 }) => {
          aribEvent.genres.push({ genre: contentNibbleLevel1, subGenre: contentNibbleLevel2 });
        });
      } else if (descriptor.tag === 0xd6) {
        const { groupType: type, events, networkEvents } = parseEventGroupDescriptorBody(descriptor);
        aribEvent.eventGroups.push({ type, events, networkEvents });
      }
    });

    result.push(aribEvent);
  });

  return result;
};
