import { BinaryStructureParser } from 'binary-structure';
import { Descriptor } from 'arib-std-b10/parsers/descriptors';

interface BinaryStructure {
  groupType: number;
  eventCount: number;
  events: {
    serviceId: number;
    eventId: number;
  }[];
  networkEvents?: {
    originalNetworkId: number;
    transportStreamId: number;
    serviceId: number;
    eventId: number;
  }[];
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure, Descriptor>([
  { id: 'groupType', type: 'uint', bitLength: 4 },
  { id: 'eventCount', type: 'uint', bitLength: 4 },
  {
    id: 'events',
    type: 'array',
    bitLength: v => v.eventCount * 32,
    children: [
      { id: 'serviceId', type: 'uint', bitLength: 16 },
      { id: 'eventId', type: 'uint', bitLength: 16 },
    ],
  },
  {
    id: 'networkEvents',
    type: 'array',
    existsWhen: v => v.groupType === 0x04 || v.groupType === 0x05,
    bitLength: (v, c) => (c.length - 1 - v.eventCount * 4) * 8,
    children: [
      { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
      { id: 'transportStreamId', type: 'uint', bitLength: 16 },
      { id: 'serviceId', type: 'uint', bitLength: 16 },
      { id: 'eventId', type: 'uint', bitLength: 16 },
    ],
  },
]);

export type EventGroupDescriptorBody = BinaryStructure;

export function parseEventGroupDescriptorBody(descriptor: Descriptor): EventGroupDescriptorBody {
  return binaryStructureParser.parse(descriptor.body, descriptor);
}
