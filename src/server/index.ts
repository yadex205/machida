import { Readable } from 'stream';
import promiseTimers from 'timers/promises';

import {
  parseEventInformationSectionToUpsertEventDocument,
  parseNetworkInformationSectionAndUpsertNetworkDocument,
  parseServiceDescriptionSectionAndUpsertServiceDocument,
} from './automations';
import { db } from 'server/db';
import { FileStreamProcessor, PsiSiPacketProcessor } from 'lib/arib-std-b10';
import { listenBroadcast } from 'lib/broadcast';

const parseMetaStream = (stream: Readable) => {
  const processor = new FileStreamProcessor(stream);
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
    db.services.clear();
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
};

(async () => {
  for (let channel = 13; channel <= 52; channel++) {
    console.log('channel: ', channel);
    try {
      const broadcast = await listenBroadcast({ channel, device: '/dev/px4video3' });
      parseMetaStream(broadcast.stream);
      await promiseTimers.setTimeout(5000);
      await broadcast.stop();
    } catch {}
  }
})();
