import {
  parseEventInformationSectionBody,
  parseNetworkInformationSectionBody,
  parseServiceDescriptionSectionBody,
  parseDescriptors,
  parseComponentDescriptorBody,
  parseContentDescriptorBody,
  parseEventGroupDescriptorBody,
  parseServiceDescriptorBody,
  parseShortEventDescriptorBody,
  ExtendedEventDescriptorProcessor,
} from './arib-std-b10';
import { db, Event, Network, Service } from './db';

export const parseEventInformationSectionToUpsertEventDocument = (
  ...args: Parameters<typeof parseEventInformationSectionBody>
): void => {
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

    const prevEventDoc = db.events.findOne({
      originalNetworkId: { $eq: originalNetworkId },
      transportStreamId: { $eq: transportStreamId },
      serviceId: { $eq: serviceId },
      eventId: { $eq: eventId },
    });

    if (prevEventDoc) {
      db.events.update({ ...prevEventDoc, ...eventDoc });
    } else {
      db.events.insert(eventDoc);
    }
  }
};

export const parseNetworkInformationSectionAndUpsertNetworkDocument = (
  ...args: Parameters<typeof parseNetworkInformationSectionBody>
): void => {
  const { networkId } = parseNetworkInformationSectionBody(...args);

  const networkDoc: Network = { networkId };

  const prevNetworkDoc = db.networks.findOne({ networkId: { $eq: networkId } });
  if (prevNetworkDoc) {
    db.networks.update({ ...prevNetworkDoc, ...networkDoc });
  } else {
    db.networks.insert(networkDoc);
  }
};

export const parseServiceDescriptionSectionAndUpsertServiceDocument = (
  ...args: Parameters<typeof parseServiceDescriptionSectionBody>
): void => {
  const { originalNetworkId, transportStreamId, services } = parseServiceDescriptionSectionBody(...args);

  for (let serviceIndex = 0; serviceIndex < services.length; serviceIndex++) {
    const { serviceId, descriptors: _descriptors } = services[serviceIndex];
    const descriptors = parseDescriptors(_descriptors);

    const serviceDoc: Service = {
      originalNetworkId,
      transportStreamId,
      serviceId,
    };

    for (let descriptorIndex = 0; descriptorIndex < descriptors.length; descriptorIndex++) {
      const descriptor = descriptors[descriptorIndex];

      if (descriptor.tag === 0x48) {
        const { serviceType, serviceProviderName, serviceName } = parseServiceDescriptorBody(descriptor);
        serviceDoc.name = serviceName;
        serviceDoc.serviceType = serviceType;
        serviceDoc.serviceProviderName = serviceProviderName;
      }
    }

    const prevServiceDoc = db.services.findOne({
      originalNetworkId: { $eq: originalNetworkId },
      transportStreamId: { $eq: transportStreamId },
      serviceId: { $eq: serviceId },
    });

    if (prevServiceDoc) {
      db.services.update({ ...prevServiceDoc, ...serviceDoc });
    } else {
      db.services.insert(serviceDoc);
    }
  }
};
