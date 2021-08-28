import { BinaryStructureParser } from 'binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  items: {
    contentNibbleLevel1: number;
    contentNibbleLevel2: number;
    userNibble1: number;
    userNibble2: number;
  }[];
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure, Descriptor>([
  {
    id: 'items',
    type: 'array',
    bitLength: (_, c) => c.length * 8,
    children: [
      { id: 'contentNibbleLevel1', type: 'uint', bitLength: 4 },
      { id: 'contentNibbleLevel2', type: 'uint', bitLength: 4 },
      { id: 'userNibble1', type: 'uint', bitLength: 4 },
      { id: 'userNibble2', type: 'uint', bitLength: 4 },
    ],
  },
]);

export type ContentDescriptorBody = BinaryStructure;

export function parseContentDescriptorBody(descriptor: Descriptor): ContentDescriptorBody {
  return binaryStructureParser.parse(descriptor.body, descriptor);
}
