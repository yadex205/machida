import { parseAribStdB24 } from 'arib-b24';
import { BinaryStructureParser } from 'binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  descriptorNumber: number;
  lastDescriptorNumber: number;
  iso639LanguageCode: Buffer;
  lengthOfItems: number;
  items: {
    itemDescriptionLength: number;
    itemDescription: Buffer;
    itemLength: number;
    item: Buffer;
  }[];
  textLength: number;
  text: Buffer;
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure>([
  { id: 'descriptorNumber', type: 'uint', bitLength: 4 },
  { id: 'lastDescriptorNumber', type: 'uint', bitLength: 4 },
  { id: 'iso639LanguageCode', type: 'raw', bitLength: 24 },
  { id: 'lengthOfItems', type: 'uint', bitLength: 8 },
  {
    id: 'items',
    type: 'array',
    bitLength: v => v.lengthOfItems * 8,
    children: [
      { id: 'itemDescriptionLength', type: 'uint', bitLength: 8 },
      { id: 'itemDescription', type: 'raw', bitLength: (_, __, sv) => sv.itemDescriptionLength * 8 },
      { id: 'itemLength', type: 'uint', bitLength: 8 },
      { id: 'item', type: 'raw', bitLength: (_, __, sv) => sv.itemLength * 8 },
    ],
  },
  { id: 'textLength', type: 'uint', bitLength: 8 },
  { id: 'text', type: 'raw', bitLength: v => v.textLength * 8 },
]);

interface ExtendedEventDescriptorBody {
  descriptorNumber: number;
  lastDescriptorNumber: number;
  iso639LanguageCode: string;
  items: {
    itemDescription: string;
    item: Buffer;
  }[];
  text: Buffer;
}

export function parseExtendedEventDescriptorBody(descriptor: Descriptor): ExtendedEventDescriptorBody {
  const { descriptorNumber, lastDescriptorNumber, iso639LanguageCode, items, text } = binaryStructureParser.parse(
    descriptor.body,
    {}
  );
  return {
    descriptorNumber,
    lastDescriptorNumber,
    iso639LanguageCode: iso639LanguageCode.toString('latin1'),
    items: items.map(item => ({
      itemDescription: parseAribStdB24(item.itemDescription),
      item: item.item,
    })),
    text: text,
  };
}
