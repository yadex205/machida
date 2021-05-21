import { createReadStream } from 'fs';
import { resolve } from 'path';
import {
  PID_PAT,
  PID_SDT_BAT,
  PID_EIT,
  parseDescriptors,
  parseEventInformationSectionBody,
  parseProgramAssociationSectionBody,
  parseServiceDescriptionSectionBody,
  parseExtendedEventDescriptorBody,
  parseServiceDescriptorBody,
  FileStreamProcessor,
  PsiSiPacketProcessor,
} from 'arib-std-b10';

const file = resolve(__dirname, '../test-files/test.ts');
const fileReadSteram = createReadStream(file, { highWaterMark: 1024 * 256 });

const patProcessor = new PsiSiPacketProcessor();
const sdtBatProcessor = new PsiSiPacketProcessor();
const eitProcessor = new PsiSiPacketProcessor();

const processor = new FileStreamProcessor(fileReadSteram);

processor.on('packet', packet => {
  if (packet.pid === PID_PAT) {
    patProcessor.feed(packet);
  } else if (packet.pid === PID_SDT_BAT) {
    sdtBatProcessor.feed(packet);
  } else if (packet.pid === PID_EIT) {
    eitProcessor.feed(packet);
  }
});

patProcessor.on('section', section => {
  parseProgramAssociationSectionBody(section);
});

sdtBatProcessor.on('section', section => {
  if (section.tableId === 0x42) {
    const { services } = parseServiceDescriptionSectionBody(section);
    services.forEach(service => {
      const descriptors = parseDescriptors(service.descriptors);
      descriptors.forEach(descriptor => {
        if (descriptor.tag === 0x48) {
          parseServiceDescriptorBody(descriptor);
        }
      });
    });
  }
});

eitProcessor.on('section', section => {
  if (section.tableId === 0x4e) {
    const { events } = parseEventInformationSectionBody(section);
    events.forEach(event => {
      const descriptors = parseDescriptors(event.descriptors);
      descriptors.forEach(descriptor => {
        if (descriptor.tag === 0x4e) {
          parseExtendedEventDescriptorBody(descriptor);
        }
      });
    });
  }
});
