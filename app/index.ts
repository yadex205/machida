import { createReadStream } from 'fs';
import { resolve } from 'path';

import {
  parseEventInformationSectionToUpsertEventDocument,
  parseNetworkInformationSectionAndUpsertNetworkDocument,
  parseServiceDescriptionSectionAndUpsertServiceDocument,
} from './automations';
import { db } from 'db';
import { FileStreamProcessor, PsiSiPacketProcessor } from 'arib-std-b10';

const file = resolve(__dirname, '../test-files/test.ts');
const fileReadSteram = createReadStream(file, { highWaterMark: 1024 * 256 });

const processor = new FileStreamProcessor(fileReadSteram);
const eitProcessor = new PsiSiPacketProcessor();
const nitProcessor = new PsiSiPacketProcessor();
const sdtBatProcessor = new PsiSiPacketProcessor();

processor.on('packet', packet => {
  if (packet.pid === 0x0010) {
    nitProcessor.feed(packet);
  } else if (packet.pid === 0x0011) {
    sdtBatProcessor.feed(packet);
  } else if (packet.pid === 0x0012) {
    eitProcessor.feed(packet);
  }
});

processor.on('end', () => {
  console.log(db.services.data);
});

eitProcessor.on('section', section => {
  if (section.tableId >= 0x4e && section.tableId <= 0x6f) {
    parseEventInformationSectionToUpsertEventDocument(section);
  }
});

nitProcessor.on('section', section => {
  if (section.tableId === 0x40 || section.tableId === 0x41) {
    parseNetworkInformationSectionAndUpsertNetworkDocument(section);
  }
});

sdtBatProcessor.on('section', section => {
  if (section.tableId === 0x42 || section.tableId === 0x46) {
    parseServiceDescriptionSectionAndUpsertServiceDocument(section);
  }
});
