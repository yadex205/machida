import { BinaryStructureParser } from 'binary-structure';

interface BinaryStructure {
  list: {
    tag: number;
    length: number;
    body: Buffer;
  }[];
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, { descriptorsByteLength: number }>([
  {
    id: 'list',
    type: 'array',
    bitLength: (_, c) => c.descriptorsByteLength * 8,
    children: [
      { id: 'tag', type: 'uint', bitLength: 8 },
      { id: 'length', type: 'uint', bitLength: 8 },
      { id: 'body', type: 'raw', bitLength: (_, __, sv) => sv.length * 8 },
    ],
  },
]);

export interface Descriptor {
  tag: number;
  length: number;
  body: Buffer;
}

export function parseDescriptors(buf: Buffer): Descriptor[] {
  return binaryStructureParser.parse(buf, { descriptorsByteLength: buf.length }).list;
}
