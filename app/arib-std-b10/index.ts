import { BinaryData } from 'binary-data';
import { BinaryStructureParser } from 'binary-structure';

export { descriptorsParser, serviceDescriptorBodyParser } from 'arib-std-b10/descriptor';

export const PID_PAT = 0x0000;
export const PID_SDT_BAT = 0x0011;
export const PID_EIT = 0x0012;

interface Packet {
  syncByte: number;
  transportErrorIndicator: number;
  payloadUnitStartIndicator: number;
  transportPriority: number;
  pid: number;
  transportScramblingControl: number;
  adaptationFieldControl: number;
  continuityCounter: number;
  adaptationField?: {
    adaptationFieldLength: number;
  };
  body?: BinaryData;
}

export const packetParser = new BinaryStructureParser<Packet>([
  { id: 'syncByte', type: 'uint', bitLength: 8 },
  { id: 'transportErrorIndicator', type: 'uint', bitLength: 1 },
  { id: 'payloadUnitStartIndicator', type: 'uint', bitLength: 1 },
  { id: 'transportPriority', type: 'uint', bitLength: 1 },
  { id: 'pid', type: 'uint', bitLength: 13 },
  { id: 'transportScramblingControl', type: 'uint', bitLength: 2 },
  { id: 'adaptationFieldControl', type: 'uint', bitLength: 2 },
  { id: 'continuityCounter', type: 'uint', bitLength: 4 },
  {
    id: 'adaptationField',
    type: 'table',
    existsWhen: ({ adaptationFieldControl }) => (adaptationFieldControl & 0b10) > 0,
    children: [
      { id: 'adaptationFieldLength', type: 'uint', bitLength: 8 },
      { type: 'ignore', bitLength: (_, __, sv) => 8 * sv.adaptationFieldLength }, // TODO: Update
    ],
  },
  {
    id: 'body',
    type: 'binary-data',
    existsWhen: v => (v.adaptationFieldControl & 0b01) > 0,
    bitLength: v =>
      8 *
      (184 -
        (typeof v.adaptationField?.adaptationFieldLength === 'number'
          ? 1 + v.adaptationField.adaptationFieldLength
          : 0)),
  },
]);

interface PsiSiSection {
  tableId: number;
  sectionSyntaxIndicator: number;
  sectionLength: number;
  body: BinaryData;
}

const psiSiSectionParser = new BinaryStructureParser<PsiSiSection>([
  { id: 'tableId', type: 'uint', bitLength: 8 },
  { id: 'sectionSyntaxIndicator', type: 'uint', bitLength: 1 },
  { type: 'ignore', bitLength: 3 },
  { id: 'sectionLength', type: 'uint', bitLength: 12 },
  { id: 'body', type: 'binary-data', bitLength: ({ sectionLength }) => sectionLength * 8 },
]);

export class PsiSiPacketProcessor {
  private sectionChunk?: Buffer;
  private lastContinuityCounter?: number;

  public processPacket(packet: Packet): PsiSiSection | undefined {
    if (!packet.body) {
      return undefined;
    }

    if (typeof this.lastContinuityCounter === 'number') {
      if (this.lastContinuityCounter === packet.continuityCounter) {
        return undefined;
      } else if (((this.lastContinuityCounter + 1) & 0b1111) !== packet.continuityCounter) {
        this.sectionChunk = undefined;
      }
    }

    if (this.sectionChunk && packet.payloadUnitStartIndicator === 0) {
      const payload = packet.body.buf.slice(packet.body.byteOffset, packet.body.byteOffset + packet.body.byteLength);
      this.sectionChunk = Buffer.concat([this.sectionChunk, payload]);
    } else if (!this.sectionChunk && packet.payloadUnitStartIndicator === 1) {
      const pointerField = packet.body.buf.readUIntBE(packet.body.byteOffset, 1);
      this.sectionChunk = packet.body.buf.slice(
        packet.body.byteOffset + 1 + pointerField,
        packet.body.byteOffset + packet.body.byteLength
      );
    } else if (this.sectionChunk && packet.payloadUnitStartIndicator === 1) {
      const pointerField = packet.body.buf.readUIntBE(packet.body.byteOffset, 1);
      const firstSectionChunk = packet.body.buf.slice(
        packet.body.byteOffset + 1,
        packet.body.byteOffset + 1 + pointerField
      );
      const completeSection = Buffer.concat([this.sectionChunk, firstSectionChunk]);
      this.sectionChunk = packet.body.buf.slice(
        packet.body.byteOffset + 1 + pointerField,
        packet.body.byteOffset + packet.body.byteLength
      );

      return psiSiSectionParser.parse(
        {
          buf: completeSection,
          byteOffset: 0,
          byteLength: completeSection.length,
        },
        {}
      );
    }

    return undefined;
  }

  public reset(): void {
    this.sectionChunk = undefined;
  }
}

interface ProgramAssociationTableSectionBody {
  transportStreamId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  pids: { broadcastingProgramNumberId: number; pid: number }[];
}

export const programAssociationTableSectionBodyParser = new BinaryStructureParser<
  ProgramAssociationTableSectionBody,
  PsiSiSection
>([
  { id: 'transportStreamId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  {
    id: 'pids',
    type: 'array',
    bitLength: (_, c) => (c.sectionLength - 9) * 8,
    children: [
      { id: 'broadcastingProgramNumberId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 3 },
      { id: 'pid', type: 'uint', bitLength: 13 },
    ],
  },
]);

interface ServiceDescriptionTableSectionBody {
  transportStreamId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  originalNetworkId: number;
  services: {
    serviceId: number;
    eitCompanyDefinitionFlag: number;
    eitScheduleFlag: number;
    eitPresentFollowingFlag: number;
    runningStatus: number;
    freeCaMode: number;
    descriptorsLoopLength: number;
    descriptors: BinaryData;
  }[];
}

export const serviceDescriptionTableSectionBodyParser = new BinaryStructureParser<
  ServiceDescriptionTableSectionBody,
  PsiSiSection
>([
  { id: 'transportStreamId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 8 },
  {
    id: 'services',
    type: 'array',
    bitLength: (_, c) => (c.sectionLength - 12) * 8,
    children: [
      { id: 'serviceId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 3 },
      { id: 'eitCompanyDefinitionFlag', type: 'uint', bitLength: 3 },
      { id: 'eitScheduleFlag', type: 'uint', bitLength: 1 },
      { id: 'eitPresentFollowingFlag', type: 'uint', bitLength: 1 },
      { id: 'runningStatus', type: 'uint', bitLength: 3 },
      { id: 'freeCaMode', type: 'uint', bitLength: 1 },
      { id: 'descriptorsLoopLength', type: 'uint', bitLength: 12 },
      { id: 'descriptors', type: 'binary-data', bitLength: (_, __, sv) => sv.descriptorsLoopLength * 8 },
    ],
  },
]);

interface EventInformationTableSectionBody {
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
    startTime: number;
    duration: number;
    runningStatus: number;
    freeCaMode: number;
    descriptorsLoopLength: number;
    descriptors: BinaryData;
  }[];
}

export const eventInformationTableSectionBodyParser = new BinaryStructureParser<
  EventInformationTableSectionBody,
  PsiSiSection
>([
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
      { id: 'startTime', type: 'uint', bitLength: 40 },
      { id: 'duration', type: 'uint', bitLength: 24 },
      { id: 'runningStatus', type: 'uint', bitLength: 3 },
      { id: 'freeCaMode', type: 'uint', bitLength: 1 },
      { id: 'descriptorsLoopLength', type: 'uint', bitLength: 12 },
      { id: 'descriptors', type: 'binary-data', bitLength: (_, __, sv) => sv.descriptorsLoopLength * 8 },
    ],
  },
]);
