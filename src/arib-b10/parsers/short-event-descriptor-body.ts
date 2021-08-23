import { parseAribStdB24 } from 'arib-b24';
import { BinaryStructureParser } from 'binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  iso639LanguageCode: Buffer;
  eventNameLength: number;
  eventName: Buffer;
  textLength: number;
  text: Buffer;
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure>([
  { id: 'iso639LanguageCode', type: 'raw', bitLength: 24 },
  { id: 'eventNameLength', type: 'uint', bitLength: 8 },
  { id: 'eventName', type: 'raw', bitLength: v => v.eventNameLength * 8 },
  { id: 'textLength', type: 'uint', bitLength: 8 },
  { id: 'text', type: 'raw', bitLength: v => v.textLength * 8 },
]);

interface ShortEventDescriptorBody {
  iso639LanguageCode: string;
  eventName: string;
  text: string;
}

export function parseShortEventDescriptorBody(descriptor: Descriptor): ShortEventDescriptorBody {
  const { iso639LanguageCode, eventName, text } = binaryStructureParser.parse(descriptor.body, {});
  return {
    iso639LanguageCode: iso639LanguageCode.toString('latin1'),
    eventName: parseAribStdB24(eventName),
    text: parseAribStdB24(text),
  };
}
