import { parseAribStdB24 } from 'arib-std-b24';

export const PID_PAT = 0x0000;
export const PID_SDT_BAT = 0x0011;

interface TsPacketHeader {
  syncByte: number;
  transportErrorIndicator: number;
  payloadUnitStartIndicator: number;
  transportPriority: number;
  pid: number;
  transportScramblingControl: number;
  adaptationFieldControl: number;
  continuityCounter: number;
}

export function parseTsPacketHeader(buf: Buffer, offset: number): TsPacketHeader {
  const data = buf.readUInt32BE(offset);

  return {
    syncByte: data >>> 24,
    transportErrorIndicator: (data >>> 23) & 0b1,
    payloadUnitStartIndicator: (data >>> 22) & 0b1,
    transportPriority: (data >>> 21) & 0b1,
    pid: (data >>> 8) & 0b0001111111111111,
    transportScramblingControl: (data >>> 6) & 0b11,
    adaptationFieldControl: (data >>> 4) & 0b11,
    continuityCounter: data & 0b1111,
  };
}

interface TsPsiSiSection {
  tableIdentifier: number;
  sectionSyntaxIndicator: number;
  reservedFutureUse: number;
  reserved: number;
  sectionLength: number;
  sectionBuffer: Buffer;
}

export class TsPsiSiPacketProcessor {
  private sectionChunk?: Buffer;
  private lastContinuityCounter?: number;

  public processPacket(buf: Buffer, offset: number, header: TsPacketHeader): TsPsiSiSection | undefined {
    if (typeof this.lastContinuityCounter === 'number') {
      if (this.lastContinuityCounter === header.continuityCounter) {
        return undefined;
      } else if (((this.lastContinuityCounter + 1) & 0b1111) !== header.continuityCounter) {
        this.sectionChunk = undefined;
      }
    }

    if (this.sectionChunk && header.payloadUnitStartIndicator === 0) {
      const payload = buf.slice(offset + 4, offset + 188);
      this.sectionChunk = Buffer.concat([this.sectionChunk, payload]);
    } else if (!this.sectionChunk && header.payloadUnitStartIndicator === 1) {
      const pointerField = buf.readUIntBE(offset + 4, 1);
      this.sectionChunk = buf.slice(offset + 4 + 1 + pointerField, offset + 188);
    } else if (this.sectionChunk && header.payloadUnitStartIndicator === 1) {
      const pointerField = buf.readUIntBE(offset + 4, 1);
      const firstSectionChunk = buf.slice(offset + 4 + 1, offset + 4 + 1 + pointerField);
      const completeSection = Buffer.concat([this.sectionChunk, firstSectionChunk]);
      this.sectionChunk = buf.slice(offset + 4 + 1 + pointerField, offset + 188);

      const sectionInformation = completeSection.readUIntBE(0, 3);
      const sectionLength = sectionInformation & 0b111111111111;
      return {
        tableIdentifier: sectionInformation >>> 16,
        sectionSyntaxIndicator: (sectionInformation >>> 15) & 0b1,
        reservedFutureUse: (sectionInformation >>> 14) & 0b1,
        reserved: (sectionInformation >>> 13) & 0b1,
        sectionLength,
        sectionBuffer: completeSection.slice(3, 3 + sectionLength),
      };
    }

    return undefined;
  }

  public reset() {
    this.sectionChunk = undefined;
  }
}

interface TsPatSection {
  transportStreamIdentifier: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  pids: { broadcastingProgramNumberIdentifier: number; pid: number }[];
}

export function parsePatSection({ sectionBuffer, sectionLength }: TsPsiSiSection): TsPatSection {
  const data1 = sectionBuffer.readUIntBE(0, 2);
  const data2 = sectionBuffer.readUIntBE(2, 3);
  const pids: TsPatSection['pids'] = [];

  for (let offset = 5; offset < sectionLength - 4; offset += 4) {
    const data = sectionBuffer.readUIntBE(offset, 4);
    pids.push({
      broadcastingProgramNumberIdentifier: data >>> 16,
      pid: data & 0b1111111111111,
    });
  }

  return {
    transportStreamIdentifier: data1,
    versionNumber: (data2 >>> 17) & 0b11111,
    currentNextIndicator: (data2 >>> 16) & 0b1,
    sectionNumber: (data2 >>> 8) & 0b11111111,
    lastSectionNumber: data2 & 0b11111111,
    pids,
  };
}

interface TsSdtSection {
  transportStreamIdentifier: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  originalNetworkIdentifier: number;
  services: {
    serviceIdentifier: number;
    eitCompanyDefinitionFlag: number;
    eitScheduleFlag: number;
    eitPresentFollowingFlag: number;
    runningStatus: number;
    freeCaMode: number;
    descriptorsLoopLength: number;
    descriptorsFieldBuffer: Buffer;
  }[];
}

export function parseSdtSection({ sectionBuffer, sectionLength }: TsPsiSiSection): TsSdtSection {
  const data1 = sectionBuffer.readUIntBE(0, 2);
  const data2 = sectionBuffer.readUIntBE(2, 3);
  const data3 = sectionBuffer.readUIntBE(5, 2);
  const services: TsSdtSection['services'] = [];

  let offset = 8;
  while (offset < sectionLength - 4) {
    const data4 = sectionBuffer.readUIntBE(offset, 3);
    const data5 = sectionBuffer.readUIntBE(offset + 3, 2);
    const descriptorsLoopLength = data5 & 0b111111111111;

    services.push({
      serviceIdentifier: data4 >>> 8,
      eitCompanyDefinitionFlag: (data4 >>> 2) & 0b111,
      eitScheduleFlag: (data4 >>> 1) & 0b1,
      eitPresentFollowingFlag: data4 & 0b1,
      runningStatus: data5 >>> 13,
      freeCaMode: (data5 >>> 12) & 0b1,
      descriptorsLoopLength,
      descriptorsFieldBuffer: sectionBuffer.slice(offset + 5, offset + 5 + descriptorsLoopLength),
    });

    offset += 5 + descriptorsLoopLength;
  }

  return {
    transportStreamIdentifier: data1,
    versionNumber: (data2 >>> 17) & 0b11111,
    currentNextIndicator: (data2 >>> 16) & 0b1,
    sectionNumber: (data2 >>> 8) & 0b11111111,
    lastSectionNumber: data2 & 0b11111111,
    originalNetworkIdentifier: data3,
    services,
  };
}

interface TsDescriptor {
  tag: number;
  length: number;
  data: Buffer;
}

export function parseTsDescriptorField(buf: Buffer, offset: number, length: number) {
  const descriptors: TsDescriptor[] = [];
  let head = 0;

  while (head < length) {
    const header = buf.readUIntBE(offset + head, 2);
    const tag = header >>> 8;
    const descriptorLength = header & 0b11111111;
    const data = buf.slice(offset + head + 2, offset + head + 2 + descriptorLength);
    descriptors.push({ tag, length: descriptorLength, data });
    head += 2 + descriptorLength;
  }

  return descriptors;
}

interface TsServiceDescriptorData {
  serviceType: number;
  serviceProviderNameLength: number;
  serviceProviderName: string;
  serviceNameLength: number;
  serviceName: string;
}

export function parseTsServiceDescriptorData({ data }: TsDescriptor): TsServiceDescriptorData {
  const serviceType = data.readUIntBE(0, 1);
  const serviceProviderNameLength = data.readUIntBE(1, 1);
  const serviceNameLength = data.readUIntBE(2 + serviceProviderNameLength, 1);

  return {
    serviceType,
    serviceProviderNameLength,
    serviceProviderName: parseAribStdB24(data.slice(2, 2 + serviceProviderNameLength)),
    serviceNameLength,
    serviceName: parseAribStdB24(
      data.slice(3 + serviceProviderNameLength, 3 + serviceProviderNameLength + serviceNameLength)
    ),
  };
}
