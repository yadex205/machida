import { createReadStream } from 'fs';
import { resolve } from 'path';
import {
  PID_SDT_BAT,
  PID_EIT,
  parseDescriptors,
  parseEventInformationSectionBody,
  parseServiceDescriptionSectionBody,
  parseComponentDescriptorBody,
  parseContentDescriptorBody,
  parseEventGroupDescriptorBody,
  parseExtendedEventDescriptorBody,
  parseServiceDescriptorBody,
  parseShortEventDescriptorBody,
  FileStreamProcessor,
  PsiSiPacketProcessor,
} from 'arib-std-b10';
import { db, Event } from 'db';

const file = resolve(__dirname, '../test-files/test.ts');
const fileReadSteram = createReadStream(file, { highWaterMark: 1024 * 256 });

const processor = new FileStreamProcessor(fileReadSteram);
const sdtBatProcessor = new PsiSiPacketProcessor();
const eitProcessor = new PsiSiPacketProcessor();

processor.on('packet', packet => {
  if (packet.pid === PID_SDT_BAT) {
    sdtBatProcessor.feed(packet);
  } else if (packet.pid === PID_EIT) {
    eitProcessor.feed(packet);
  }
});

sdtBatProcessor.on('section', section => {
  if (section.tableId === 0x42) {
    const { services: _services, originalNetworkId } = parseServiceDescriptionSectionBody(section);

    const services = _services.map(service => {
      const descriptors = parseDescriptors(service.descriptors);
      const serviceDescriptor = descriptors.find(({ tag }) => tag === 0x48);
      const { serviceProviderName = '', serviceName = '' } = serviceDescriptor
        ? parseServiceDescriptorBody(serviceDescriptor)
        : {};

      return {
        id: service.serviceId,
        originalNetworkId,
        serviceProviderName,
        serviceName,
      };
    });

    services;
  }
});

eitProcessor.on('section', section => {
  if (section.tableId === 0x50) {
    const eventInformation = parseEventInformationSectionBody(section);
    const { serviceId } = eventInformation;

    eventInformation.events.forEach(event => {
      const eventNameOfLanguages: Event['name'] = {};
      const summaryOfLanguages: Event['summary'] = {};
      const detailsOfLanguages: Event['detail'] = {};
      const additionalDescriptionOfLanguages: Event['additionalDescription'] = {};
      const components: Event['components'] = [];
      const genres: Event['genres'] = [];
      const eventGroups: Event['eventGroups'] = [];

      const descriptors = parseDescriptors(event.descriptors);
      descriptors.forEach(descriptor => {
        if (descriptor.tag === 0x4d) {
          const { iso639LanguageCode, eventName, text } = parseShortEventDescriptorBody(descriptor);
          eventNameOfLanguages[iso639LanguageCode] = eventName;
          summaryOfLanguages[iso639LanguageCode] = text;
        } else if (descriptor.tag === 0x4e) {
          const { iso639LanguageCode, items, text } = parseExtendedEventDescriptorBody(descriptor);
          if (!detailsOfLanguages[iso639LanguageCode]) {
            detailsOfLanguages[iso639LanguageCode] = [];
          }
          items.map(({ itemDescription, item }) => {
            detailsOfLanguages[iso639LanguageCode].push({ subject: itemDescription, content: item });
          });
          additionalDescriptionOfLanguages[iso639LanguageCode] = text;
        } else if (descriptor.tag === 0x50) {
          const { streamContent, componentType, componentTag, iso639LanguageCode, text } =
            parseComponentDescriptorBody(descriptor);
          const existingComponent = components.find(
            c =>
              c.streamContent === streamContent && c.componentType === componentType && c.componentTag === componentTag
          );
          if (existingComponent) {
            existingComponent.texts[iso639LanguageCode] = text;
          } else {
            components.push({ streamContent, componentType, componentTag, texts: { [iso639LanguageCode]: text } });
          }
        } else if (descriptor.tag === 0x54) {
          const { items } = parseContentDescriptorBody(descriptor);
          items.forEach(({ contentNibbleLevel1, contentNibbleLevel2 }) => {
            genres.push({ genre: contentNibbleLevel1, subGenre: contentNibbleLevel2 });
          });
        } else if (descriptor.tag === 0xd6) {
          const { groupType: type, events, networkEvents } = parseEventGroupDescriptorBody(descriptor);
          eventGroups.push({ type, events, networkEvents });
        }
      });

      const { eventId, startTime, duration } = event;

      const eventDoc = db.events.findOne({ serviceId: { $eq: serviceId }, eventId: { $eq: eventId } });
      if (!eventDoc) {
        db.events.insert({
          serviceId,
          eventId,
          schedule: {
            start: startTime,
            duration,
          },
          name: eventNameOfLanguages,
          summary: summaryOfLanguages,
          detail: detailsOfLanguages,
          additionalDescription: additionalDescriptionOfLanguages,
          components,
          genres,
          eventGroups,
        });
      } else {
        db.events.update({
          ...eventDoc,
          schedule: {
            start: startTime,
            duration,
          },
          name: eventNameOfLanguages,
          summary: summaryOfLanguages,
          detail: detailsOfLanguages,
          additionalDescription: additionalDescriptionOfLanguages,
          components,
          genres,
          eventGroups,
        });
      }
    });
  }
});
