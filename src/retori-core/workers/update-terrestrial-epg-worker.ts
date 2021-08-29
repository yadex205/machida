import EventEmitter from 'events';
import promiseTimers from 'timers/promises';

import { FileStreamProcessor, PsiSiPacketProcessor } from 'arib-b10';

import { getAllEvents, saveEventsFromEventInformationSection } from '../models/event';
import { Tuner } from '../tuner';

const DEFAULT_TERRESTRIAL_BROADCAST_CHANNELS = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
];

export class UpdateTerrestrialEpgWorker extends EventEmitter {
  public perform = async () => {
    const channels = DEFAULT_TERRESTRIAL_BROADCAST_CHANNELS;
    const tuner = Tuner.findAvailableTuner('GR');
    if (!tuner) {
      throw new Error('Cannot find available tuner.');
    }

    Tuner.occupy(tuner);

    for (const channel of channels) {
      try {
        await tuner.start(channel);
        if (!tuner.readableStream) {
          throw new Error("Tuner's readableStream is not available.");
        }

        const fileProcessor = new FileStreamProcessor(tuner.readableStream);
        const eitProcessor = new PsiSiPacketProcessor();

        fileProcessor.on('packet', packet => {
          if (packet.pid === 0x0012) {
            eitProcessor.feed(packet);
          }
        });

        eitProcessor.on('section', section => {
          if (section.tableId >= 0x4e && section.tableId <= 0x6f) {
            saveEventsFromEventInformationSection(section);
          }
        });

        await promiseTimers.setTimeout(5000);
        await tuner.stop();
      } catch {
        continue;
      }
    }

    Tuner.release(tuner);
    console.log(getAllEvents());
  };
}
