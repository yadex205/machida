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
  parseExtendedEventDescriptorBody,
  parseServiceDescriptorBody,
  parseShortEventDescriptorBody,
  FileStreamProcessor,
  PsiSiPacketProcessor,
} from 'arib-std-b10';

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

    const events = eventInformation.events.map(event => {
      const eventNameOfLanguages: Record<string, string> = {};
      const summaryOfLanguages: Record<string, string> = {};
      const detailsOfLanguages: Record<string, { subject: string; content: string }[]> = {};
      const additionalDescriptionOfLanguages: Record<string, string> = {};
      const genres: { genre: number; subGenre: number }[] = [];

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
          parseComponentDescriptorBody(descriptor);
        } else if (descriptor.tag === 0x54) {
          const { items } = parseContentDescriptorBody(descriptor);
          items.forEach(({ contentNibbleLevel1, contentNibbleLevel2 }) => {
            genres.push({ genre: contentNibbleLevel1, subGenre: contentNibbleLevel2 });
          });
        }
      });

      const { eventId, startTime, duration } = event;

      return {
        id: eventId,
        serviceId,
        startTime,
        duration,
        eventName: eventNameOfLanguages,
        summary: summaryOfLanguages,
        details: detailsOfLanguages,
        additionalDescription: additionalDescriptionOfLanguages,
        genres,
      };
    });

    events;
  }
});
