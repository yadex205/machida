import EventEmitter from 'events';
import promiseTimers from 'timers/promises';

import { FileStreamProcessor, PsiSiPacketProcessor } from 'arib-b10';

import { epgDatabase as db } from '../db';
import { extractAribEventsFromEventInformationSection, AribEvent } from '../models/arib-event';
import { extractAribNetworkFromNetworkInformationSection, AribNetwork } from '../models/arib-network';
import { extractAribServicesFromServiceDescriptionSection, AribService } from '../models/arib-service';
import { Tuner } from '../tuner';

const DEFAULT_TERRESTRIAL_BROADCAST_CHANNELS = [
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,
];

export class UpdateTerrestrialEpgWorker extends EventEmitter {
  public perform = async () => {
    const channels = DEFAULT_TERRESTRIAL_BROADCAST_CHANNELS;
    const listenDuration = 20000;
    const tuner = Tuner.findAvailableTuner('GR');
    if (!tuner) {
      throw new Error('Cannot find available tuner.');
    }

    Tuner.occupy(tuner);

    for (const channel of channels) {
      const aribEvents = new Map<string, AribEvent>();
      const aribNetworks = new Map<string, AribNetwork>();
      const aribServices = new Map<string, AribService>();

      try {
        await tuner.start(channel);
        if (!tuner.readableStream) {
          throw new Error("Tuner's readableStream is not available.");
        }

        const fileProcessor = new FileStreamProcessor(tuner.readableStream);
        const eitProcessor01 = new PsiSiPacketProcessor();
        const eitProcessor02 = new PsiSiPacketProcessor();
        const eitProcessor03 = new PsiSiPacketProcessor();
        const nitProcessor = new PsiSiPacketProcessor();
        const sdtBatProcessor = new PsiSiPacketProcessor();

        fileProcessor.on('packet', packet => {
          if (packet.pid == 0x0010) {
            nitProcessor.feed(packet);
          } else if (packet.pid === 0x0011) {
            sdtBatProcessor.feed(packet);
          } else if (packet.pid === 0x0012) {
            eitProcessor01.feed(packet);
          } else if (packet.pid === 0x0026) {
            eitProcessor02.feed(packet);
          } else if (packet.pid === 0x0027) {
            eitProcessor03.feed(packet);
          }
        });

        eitProcessor01.on('section', section => {
          if (section.tableId >= 0x4e && section.tableId <= 0x6f) {
            const extractedAribEvents = extractAribEventsFromEventInformationSection(section);
            extractedAribEvents.forEach(aribEvent => {
              const key = `${aribEvent.serviceId}/${aribEvent.eventId}`;
              aribEvents.set(key, aribEvent);
            });
          }
        });

        eitProcessor02.on('section', section => {
          if (section.tableId >= 0x4e && section.tableId <= 0x6f) {
            const extractedAribEvents = extractAribEventsFromEventInformationSection(section);
            extractedAribEvents.forEach(aribEvent => {
              const key = `${aribEvent.serviceId}/${aribEvent.eventId}`;
              aribEvents.set(key, aribEvent);
            });
          }
        });

        eitProcessor03.on('section', section => {
          if (section.tableId >= 0x4e && section.tableId <= 0x6f) {
            const extractedAribEvents = extractAribEventsFromEventInformationSection(section);
            extractedAribEvents.forEach(aribEvent => {
              const key = `${aribEvent.serviceId}/${aribEvent.eventId}`;
              aribEvents.set(key, aribEvent);
            });
          }
        });

        nitProcessor.on('section', section => {
          if (section.tableId === 0x40 || section.tableId === 0x41) {
            const extractedAribNetwork = extractAribNetworkFromNetworkInformationSection(section);
            const key = extractedAribNetwork.networkId.toString();
            aribNetworks.set(key, extractedAribNetwork);
          }
        });

        sdtBatProcessor.on('section', section => {
          if (section.tableId === 0x42 || section.tableId === 0x46) {
            const extractedAribServices = extractAribServicesFromServiceDescriptionSection(section);
            extractedAribServices.forEach(aribService => {
              const key = aribService.serviceId.toString();
              aribServices.set(key, aribService);
            });
          }
        });

        await promiseTimers.setTimeout(listenDuration);
        await tuner.stop();
      } catch {
        continue;
      }

      for (const aribEvent of aribEvents.values()) {
        const existingAribEvent = db.aribEvents.findOne({
          serviceId: { $eq: aribEvent.serviceId },
          eventId: { $eq: aribEvent },
        });
        if (existingAribEvent) {
          db.aribEvents.update({ ...existingAribEvent, ...aribEvent });
        } else {
          db.aribEvents.insert(aribEvent);
        }
      }

      for (const aribNetwork of aribNetworks.values()) {
        const existingAribNetwork = db.aribNetworks.findOne({
          networkId: { $eq: aribNetwork.networkId },
        });
        if (existingAribNetwork) {
          db.aribNetworks.update({ ...existingAribNetwork, ...aribNetwork });
        } else {
          db.aribNetworks.insert(aribNetwork);
        }
      }

      for (const aribService of aribServices.values()) {
        const existingAribService = db.aribServices.findOne({
          serviceId: { $eq: aribService.serviceId },
        });
        if (existingAribService) {
          db.aribServices.update({ ...existingAribService, ...aribService });
        } else {
          db.aribServices.insert(aribService);
        }
      }
    }

    Tuner.release(tuner);
  };
}
