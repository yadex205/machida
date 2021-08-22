import EventEmitter from 'events';
import promiseTimers from 'timers/promises';

import { FileStreamProcessor, PsiSiPacketProcessor } from 'lib/arib-std-b10';
import { listenBroadcast } from 'lib/broadcast';

import {
  parseEventInformationSectionToUpsertEventDocument,
  parseNetworkInformationSectionAndUpsertNetworkDocument,
  parseServiceDescriptionSectionAndUpsertServiceDocument,
} from 'server/automations';
import { db } from 'server/db';

interface ListenBroadcastToUpdateDatabaseWorkerArgs {
  channels?: number[];
  device: string;
  duration?: number;
}

const defaultChannels: ListenBroadcastToUpdateDatabaseWorkerArgs['channels'] = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
];

export class ListenBroadcastToUpdateDatabaseWorker extends EventEmitter {
  public run = async ({
    channels = defaultChannels,
    device,
    duration = 5000,
  }: ListenBroadcastToUpdateDatabaseWorkerArgs) => {
    if (!channels) {
      return;
    }

    for (const channel of channels) {
      try {
        const broadcast = await listenBroadcast({ channel, device });
        const processor = new FileStreamProcessor(broadcast.stream);
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
        await promiseTimers.setTimeout(duration);
        await broadcast.stop();
      } catch {}
    }
  };
}
