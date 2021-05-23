import { BinaryStructureParser } from 'binary-structure';
import { Descriptor } from 'arib-std-b10/parsers/descriptors';
import { parseAribStdB24 } from 'arib-std-b24';

interface BinaryStructure {
  streamContent: number;
  componentType: number;
  componentTag: number;
  iso639LanguageCode: Buffer;
  text: Buffer;
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure, Descriptor>([
  { type: 'ignore', bitLength: 4 },
  { id: 'streamContent', type: 'uint', bitLength: 4 },
  { id: 'componentType', type: 'uint', bitLength: 8 },
  { id: 'componentTag', type: 'uint', bitLength: 8 },
  { id: 'iso639LanguageCode', type: 'raw', bitLength: 24 },
  { id: 'text', type: 'raw', bitLength: (_, c) => (c.length - 6) * 8 },
]);

export interface ComponentDescriptorBody {
  streamContent: number;
  componentType: number;
  componentTag: number;
  iso639LanguageCode: string;
  text: string;
}

export function parseComponentDescriptorBody(descriptor: Descriptor): ComponentDescriptorBody {
  const rawData = binaryStructureParser.parse(descriptor.body, descriptor);

  return {
    ...rawData,
    iso639LanguageCode: rawData.iso639LanguageCode.toString('latin1'),
    text: parseAribStdB24(rawData.text),
  };
}
