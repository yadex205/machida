import { createReadStream } from 'fs';
import { resolve } from 'path';
import { getNativeBufferOfBinaryData } from 'binary-data';
import {
  PID_PAT,
  PID_SDT_BAT,
  PID_EIT,
  packetParser,
  PsiSiPacketProcessor,
  eventInformationTableSectionBodyParser,
  programAssociationTableSectionBodyParser,
  serviceDescriptionTableSectionBodyParser,
  descriptorsParser,
  serviceDescriptorBodyParser,
} from 'arib-std-b10';
import { parseAribStdB24 } from 'arib-std-b24';

const file = resolve(__dirname, '../test-files/test.ts');
const fileReadSteram = createReadStream(file, { highWaterMark: 188 * 100 });

const patProcessor = new PsiSiPacketProcessor();
const sdtBatProcessor = new PsiSiPacketProcessor();
const eitProcessor = new PsiSiPacketProcessor();

fileReadSteram.on('data', (chunk: Buffer) => {
  for (let offset = 0; offset < chunk.length; offset += 188) {
    const packet = packetParser.parse({ buf: chunk, byteOffset: offset, byteLength: 188 }, {});

    if (packet.pid === PID_PAT) {
      const section = patProcessor.processPacket(packet);
      if (section) {
        programAssociationTableSectionBodyParser.parse(section.body, section);
      }
    } else if (packet.pid === PID_SDT_BAT) {
      const section = sdtBatProcessor.processPacket(packet);

      if (section?.tableId === 0x42 || section?.tableId === 0x46) {
        const sdt = serviceDescriptionTableSectionBodyParser.parse(section.body, section);
        sdt.services.forEach(service => {
          const descriptors = descriptorsParser.parse(service.descriptors, {
            totalByteLength: service.descriptorsLoopLength,
          });
          descriptors.list.forEach(descriptor => {
            if (descriptor.tag === 0x48) {
              const serviceDescriptor = serviceDescriptorBodyParser.parse(descriptor.body, {});
              const serviceName = parseAribStdB24(getNativeBufferOfBinaryData(serviceDescriptor.serviceName));
              serviceName;
            }
          });
        });
      }
    } else if (packet.pid === PID_EIT) {
      const section = eitProcessor.processPacket(packet);

      if (section?.tableId === 0x4e) {
        const eit = eventInformationTableSectionBodyParser.parse(section.body, section);

        eit.events.forEach(event => {
          const descriptors = descriptorsParser.parse(event.descriptors, {
            totalByteLength: event.descriptorsLoopLength,
          });
          console.log(descriptors);
        });
      }
    }
  }
});
