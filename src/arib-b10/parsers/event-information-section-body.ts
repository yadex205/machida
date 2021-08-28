import { BinaryStructureParser } from 'binary-structure';

import { parseDate, parseDurationSeconds } from './datetime';
import { PsiSiSection } from './psi-si-section';

interface BinaryStructure {
  serviceId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  transportStreamId: number;
  originalNetworkId: number;
  segmentLastSectionNumber: number;
  lastTableId: number;
  events: {
    eventId: number;
    startTime: Buffer;
    duration: Buffer;
    runningStatus: number;
    freeCaMode: number;
    descriptorsLoopLength: number;
    descriptors: Buffer;
  }[];
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure, PsiSiSection>([
  { id: 'serviceId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  { id: 'transportStreamId', type: 'uint', bitLength: 16 },
  { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
  { id: 'segmentLastSectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastTableId', type: 'uint', bitLength: 8 },
  {
    id: 'events',
    type: 'array',
    bitLength: (_, c) => (c.sectionLength - 15) * 8,
    children: [
      { id: 'eventId', type: 'uint', bitLength: 16 },
      { id: 'startTime', type: 'raw', bitLength: 40 },
      { id: 'duration', type: 'raw', bitLength: 24 },
      { id: 'runningStatus', type: 'uint', bitLength: 3 },
      { id: 'freeCaMode', type: 'uint', bitLength: 1 },
      { id: 'descriptorsLoopLength', type: 'uint', bitLength: 12 },
      { id: 'descriptors', type: 'raw', bitLength: (_, __, sv) => sv.descriptorsLoopLength * 8 },
    ],
  },
]);

export interface EventInformationSectionBody {
  serviceId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  transportStreamId: number;
  originalNetworkId: number;
  segmentLastSectionNumber: number;
  lastTableId: number;
  events: {
    eventId: number;
    startTime: Date | undefined;
    duration: number | undefined;
    runningStatus: number;
    freeCaMode: number;
    descriptors: Buffer;
  }[];
}

export function parseEventInformationSectionBody(section: PsiSiSection): EventInformationSectionBody {
  const rawData = binaryStructureParser.parse(section.body, section);

  return {
    ...rawData,
    events: rawData.events.map(event => ({
      ...event,
      startTime: parseDate(event.startTime),
      duration: parseDurationSeconds(event.duration),
    })),
  };
}
