import { BinaryStructureParser } from 'binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  serviceList: {
    serviceId: number;
    serviceType: number;
  }[];
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure, Descriptor>([
  {
    id: 'serviceList',
    type: 'array',
    bitLength: (_, c) => c.length * 8,
    children: [
      {
        id: 'serviceId',
        type: 'uint',
        bitLength: 16,
      },
      { id: 'serviceType', type: 'uint', bitLength: 8 },
    ],
  },
]);

export type ServiceListDescriptorBody = BinaryStructure;

export function parseServiceListDescriptorBody(descriptor: Descriptor): ServiceListDescriptorBody {
  return binaryStructureParser.parse(descriptor.body, descriptor);
}
