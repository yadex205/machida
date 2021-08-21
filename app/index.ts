import { createReadStream } from 'fs';
import { resolve } from 'path';

import {
  parseEventInformationSectionToUpsertEventDocument,
  parseServiceDescriptionSectionAndUpsertServiceDocument,
} from './automations';
import { PID_SDT_BAT, PID_EIT, FileStreamProcessor, PsiSiPacketProcessor } from 'arib-std-b10';

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
    parseServiceDescriptionSectionAndUpsertServiceDocument(section);
  }
});

eitProcessor.on('section', section => {
  if (section.tableId === 0x50) {
    parseEventInformationSectionToUpsertEventDocument(section);
  }
});
