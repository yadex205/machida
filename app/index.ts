import { createReadStream } from 'fs';
import { resolve } from 'path';
import {
  PID_PAT,
  PID_SDT_BAT,
  parseTsPacketHeader,
  TsPsiSiPacketProcessor,
  parsePatSection,
  parseSdtSection,
  parseTsDescriptorField,
  parseTsServiceDescriptorData,
} from 'ts-packet';

const file = resolve(__dirname, '../test-files/test.ts');
const fileReadSteram = createReadStream(file, { highWaterMark: 188 * 100 });

const patProcessor = new TsPsiSiPacketProcessor();
const sdtBatProcessor = new TsPsiSiPacketProcessor();

fileReadSteram.on('data', (chunk: Buffer) => {
  for (let offset = 0; offset < chunk.length; offset += 188) {
    const tsPacketHeader = parseTsPacketHeader(chunk, offset);

    if (tsPacketHeader.pid === PID_PAT) {
      const section = patProcessor.processPacket(chunk, offset, tsPacketHeader);
      if (section) {
        parsePatSection(section);
      }
    } else if (tsPacketHeader.pid === PID_SDT_BAT) {
      const section = sdtBatProcessor.processPacket(chunk, offset, tsPacketHeader);
      if (section?.tableIdentifier === 0x42 || section?.tableIdentifier === 0x46) {
        const sdtSection = parseSdtSection(section);
        sdtSection.services.forEach(service => {
          console.log(service);
          const descriptors = parseTsDescriptorField(service.descriptorsFieldBuffer, 0, service.descriptorsLoopLength);
          console.log(descriptors);
          descriptors.forEach(descriptor => {
            if (descriptor.tag === 0x48) {
              console.log(parseTsServiceDescriptorData(descriptor));
            }
          });
        });
      }
    }
  }
});
