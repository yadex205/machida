import { jisx0213Table } from './jisx0213';
import { jisx0201AlphanumericTable, jisx0201KatakanaTable } from './jisx0201';
import { convertHankakuToZenkaku, convertZenkakuToHankaku } from './zenkaku-hankaku';

type AribStdB24Area = 'c0' | 'c1' | 'gl' | 'gr';
type AribStdB24Buffer = 'g0' | 'g1' | 'g2' | 'g3';
type AribStdB24CharSize = 'normal' | 'middle';
type AribStdB24GSetGraphicSetName =
  | 'kanji'
  | 'alphanumeric'
  | 'hiragana'
  | 'katakana'
  | 'mosaic-a'
  | 'mosaic-b'
  | 'mosaic-c'
  | 'mosaic-d'
  | 'proportional-alphanumeric'
  | 'proportional-hiragana'
  | 'proportional-katakana'
  | 'jisx0201-katakana'
  | 'jis-compatible-kanji-plane-1'
  | 'jis-compatible-kanji-plane-2'
  | 'additional-symbols';

type AribStdB24DRCSGraphicSetName =
  | 'drcs-0'
  | 'drcs-1'
  | 'drcs-2'
  | 'drcs-3'
  | 'drcs-4'
  | 'drcs-5'
  | 'drcs-6'
  | 'drcs-7'
  | 'drcs-8'
  | 'drcs-9'
  | 'drcs-10'
  | 'drcs-11'
  | 'drcs-12'
  | 'drcs-13'
  | 'drcs-14'
  | 'drcs-15'
  | 'macro';

interface AribStdB24SymbolSet {
  length: number;
  name: AribStdB24GSetGraphicSetName | AribStdB24DRCSGraphicSetName | undefined;
}

const gSetGraphicSetNameMap: Record<number, AribStdB24GSetGraphicSetName | undefined> = {
  0x42: 'kanji',
  0x4a: 'alphanumeric',
  0x30: 'hiragana',
  0x31: 'katakana',
  0x32: 'mosaic-a',
  0x33: 'mosaic-b',
  0x34: 'mosaic-c',
  0x35: 'mosaic-d',
  0x36: 'proportional-alphanumeric',
  0x37: 'proportional-hiragana',
  0x38: 'proportional-katakana',
  0x49: 'jisx0201-katakana',
  0x39: 'jis-compatible-kanji-plane-1',
  0x3a: 'jis-compatible-kanji-plane-2',
  0x3b: 'additional-symbols',
};

const drcsGraphicSetNameMap: Record<number, AribStdB24DRCSGraphicSetName | undefined> = {
  0x40: 'drcs-0',
  0x41: 'drcs-1',
  0x42: 'drcs-2',
  0x43: 'drcs-3',
  0x44: 'drcs-4',
  0x45: 'drcs-5',
  0x46: 'drcs-6',
  0x47: 'drcs-7',
  0x48: 'drcs-8',
  0x49: 'drcs-9',
  0x4a: 'drcs-10',
  0x4b: 'drcs-11',
  0x4c: 'drcs-12',
  0x4d: 'drcs-13',
  0x4e: 'drcs-14',
  0x5f: 'drcs-15',
  0x70: 'macro',
};

type CharCode2String = Record<
  AribStdB24GSetGraphicSetName | AribStdB24DRCSGraphicSetName,
  undefined | Record<AribStdB24CharSize, undefined | ((charCode: number) => string)>
>;

const kanjiNormalTable = Object.fromEntries(
  Object.entries(jisx0213Table).map(([key, value]) => [key, convertHankakuToZenkaku(value)])
);
const kanjiMiddleTable = Object.fromEntries(
  Object.entries(jisx0213Table).map(([key, value]) => [key, convertZenkakuToHankaku(value)])
);
const alphanumericNormalTable = Object.fromEntries(
  Object.entries(jisx0201AlphanumericTable).map(([key, value]) => [key, convertHankakuToZenkaku(value)])
);
const alphanumericMiddleTable = Object.fromEntries(
  Object.entries(jisx0201AlphanumericTable).map(([key, value]) => [key, convertZenkakuToHankaku(value)])
);
const jisx0201KatakanaNormalTable = Object.fromEntries(
  Object.entries(jisx0201KatakanaTable).map(([key, value]) => [key, convertHankakuToZenkaku(value)])
);
const jisx0201KatakanaMiddleTable = Object.fromEntries(
  Object.entries(jisx0201KatakanaTable).map(([key, value]) => [key, convertZenkakuToHankaku(value)])
);

const charCode2String: CharCode2String = {
  kanji: {
    normal: charCode => kanjiNormalTable[charCode] || '',
    middle: charCode => kanjiMiddleTable[charCode] || '',
  },
  alphanumeric: {
    normal: charCode => alphanumericNormalTable[charCode] || '',
    middle: charCode => alphanumericMiddleTable[charCode] || '',
  },
  hiragana: undefined,
  katakana: undefined,
  'mosaic-a': undefined,
  'mosaic-b': undefined,
  'mosaic-c': undefined,
  'mosaic-d': undefined,
  'proportional-alphanumeric': undefined,
  'proportional-hiragana': undefined,
  'proportional-katakana': undefined,
  'jisx0201-katakana': {
    normal: charCode => jisx0201KatakanaNormalTable[charCode] || '',
    middle: charCode => jisx0201KatakanaMiddleTable[charCode] || '',
  },
  'jis-compatible-kanji-plane-1': undefined,
  'jis-compatible-kanji-plane-2': undefined,
  'additional-symbols': undefined,
  'drcs-0': undefined,
  'drcs-1': undefined,
  'drcs-2': undefined,
  'drcs-3': undefined,
  'drcs-4': undefined,
  'drcs-5': undefined,
  'drcs-6': undefined,
  'drcs-7': undefined,
  'drcs-8': undefined,
  'drcs-9': undefined,
  'drcs-10': undefined,
  'drcs-11': undefined,
  'drcs-12': undefined,
  'drcs-13': undefined,
  'drcs-14': undefined,
  'drcs-15': undefined,
  macro: undefined,
};

export function parseAribStdB24(buf: Buffer) {
  const lockingShiftInvocations: Record<Exclude<AribStdB24Area, 'c0' | 'c1'>, AribStdB24Buffer> = {
    gl: 'g0',
    gr: 'g2',
  };

  const singleShiftInvocations: Record<Exclude<AribStdB24Area, 'c0' | 'c1'>, AribStdB24Buffer | undefined> = {
    gl: undefined,
    gr: undefined,
  };

  const designations: Record<AribStdB24Buffer, AribStdB24SymbolSet> = {
    g0: { length: 2, name: 'kanji' },
    g1: { length: 1, name: 'alphanumeric' },
    g2: { length: 1, name: 'hiragana' },
    g3: { length: 1, name: 'katakana' },
  };

  let charSize: AribStdB24CharSize = 'normal';

  let result = '';
  let head = 0;
  let previousHead = head;

  while (head < buf.length) {
    previousHead = head;
    const firstByte = buf.readUIntBE(head, 1);

    if ((firstByte & 0b01100000) > 0) {
      const area = firstByte >>> 7 === 1 ? 'gr' : 'gl';
      const symbolSet = designations[singleShiftInvocations[area] || lockingShiftInvocations[area]];

      const charCode = buf.readUIntBE(head, symbolSet.length);
      result += (symbolSet.name && charCode2String[symbolSet.name]?.[charSize]?.(charCode)) || '';

      head += symbolSet.length;
      singleShiftInvocations.gl = undefined;
      singleShiftInvocations.gr = undefined;
    } else if (firstByte === 0x0f) {
      // Invocation (LS0)
      lockingShiftInvocations.gl = 'g0';
      head += 1;
    } else if (firstByte === 0x0e) {
      // Invocation (LS1)
      lockingShiftInvocations.gl = 'g1';
      head += 1;
    } else if (firstByte === 0x19) {
      // Invocation (SS2)
      singleShiftInvocations.gl = 'g2';
      head += 1;
    } else if (firstByte === 0x1d) {
      // Invocation (SS3)
      singleShiftInvocations.gl = 'g3';
      head += 1;
    } else if (firstByte === 0x1b) {
      // Esc
      const secondByte = buf.readUIntLE(head + 1, 1);
      if (secondByte === 0x6e) {
        // Invocation (LS2)
        lockingShiftInvocations.gl = 'g2';
        head += 2;
      } else if (secondByte === 0x6f) {
        // Invocation (LS3)
        lockingShiftInvocations.gl = 'g3';
        head += 2;
      } else if (secondByte === 0x7e) {
        // Invocation (LS1R)
        lockingShiftInvocations.gr = 'g1';
        head += 2;
      } else if (secondByte === 0x7d) {
        // Invocation (LS2R)
        lockingShiftInvocations.gr = 'g2';
        head += 2;
      } else if (secondByte === 0x7c) {
        // Invocation (LS3R)
        lockingShiftInvocations.gr = 'g3';
        head += 2;
      } else if (secondByte === 0x28) {
        const thirdByte = buf.readUIntBE(head + 2, 1);
        if (thirdByte !== 0x20) {
          // Designation (1-byte G set to G0)
          designations.g0.length = 1;
          designations.g0.name = gSetGraphicSetNameMap[thirdByte];
          head += 3;
        } else {
          // Designation (1-byte DRCS to G0)
          const forthByte = buf.readUIntBE(head + 3, 1);
          designations.g0.length = 1;
          designations.g0.name = drcsGraphicSetNameMap[forthByte];
          head += 4;
        }
      } else if (secondByte === 0x29) {
        const thirdByte = buf.readUIntBE(head + 2, 1);
        if (thirdByte !== 0x20) {
          // Designation (1-byte G set to G1)
          designations.g1.length = 1;
          designations.g1.name = gSetGraphicSetNameMap[thirdByte];
          head += 3;
        } else {
          // Designation (1-byte DRCS to G1)
          const forthByte = buf.readUIntBE(head + 3, 1);
          designations.g1.length = 1;
          designations.g1.name = drcsGraphicSetNameMap[forthByte];
          head += 4;
        }
      } else if (secondByte === 0x2a) {
        const thirdByte = buf.readUIntBE(head + 2, 1);
        if (thirdByte !== 0x20) {
          // Designation (1-byte G set to G2)
          designations.g2.length = 1;
          designations.g2.name = gSetGraphicSetNameMap[thirdByte];
          head += 3;
        } else {
          // Designation (1-byte DRCS to G2)
          const forthByte = buf.readUIntBE(head + 3, 1);
          designations.g2.length = 1;
          designations.g2.name = drcsGraphicSetNameMap[forthByte];
          head += 4;
        }
      } else if (secondByte === 0x2b) {
        const thirdByte = buf.readUIntBE(head + 2, 1);
        if (thirdByte !== 0x20) {
          // Designation (1-byte G set to G3)
          designations.g3.length = 1;
          designations.g3.name = gSetGraphicSetNameMap[thirdByte];
          head += 3;
        } else {
          // Designation (1-byte DRCS to G3)
          const forthByte = buf.readUIntBE(head + 3, 1);
          designations.g3.length = 1;
          designations.g3.name = drcsGraphicSetNameMap[forthByte];
          head += 4;
        }
      } else if (secondByte === 0x24) {
        const thirdByte = buf.readUIntBE(head + 2, 1);
        if (thirdByte !== 0x28 && thirdByte !== 0x29 && thirdByte !== 0x2a && thirdByte !== 0x2b) {
          // Designation (2-byte G set to G0)
          designations.g0.length = 2;
          designations.g0.name = gSetGraphicSetNameMap[thirdByte];
          head += 3;
        } else if (thirdByte === 0x28) {
          const forthByte = buf.readUIntBE(head + 3, 1);
          if (forthByte === 0x20) {
            // Designation (2-byte DRCS to G0)
            const fifthByte = buf.readUIntBE(head + 4, 1);
            designations.g0.length = 2;
            designations.g0.name = drcsGraphicSetNameMap[fifthByte];
            head += 5;
          }
        } else if (thirdByte === 0x29) {
          const forthByte = buf.readUIntBE(head + 3, 1);
          if (forthByte !== 0x20) {
            // Designation (2-byte G set to G1)
            designations.g1.length = 2;
            designations.g1.name = gSetGraphicSetNameMap[forthByte];
            head += 4;
          } else {
            // Designation (2-byte DRCS to G1)
            const fifthByte = buf.readUIntBE(head + 4, 1);
            designations.g1.length = 2;
            designations.g1.name = drcsGraphicSetNameMap[fifthByte];
            head += 5;
          }
        } else if (thirdByte === 0x2a) {
          const forthByte = buf.readUIntBE(head + 3, 1);
          if (forthByte !== 0x20) {
            // Designation (2-byte G set to G2)
            designations.g2.length = 2;
            designations.g2.name = gSetGraphicSetNameMap[forthByte];
            head += 4;
          } else {
            // Designation (2-byte DRCS to G2)
            const fifthByte = buf.readUIntBE(head + 4, 1);
            designations.g2.length = 2;
            designations.g2.name = drcsGraphicSetNameMap[fifthByte];
            head += 5;
          }
        } else if (thirdByte === 0x2b) {
          const forthByte = buf.readUIntBE(head + 3, 1);
          if (forthByte !== 0x20) {
            // Designation (2-byte G set to G3)
            designations.g3.length = 2;
            designations.g3.name = gSetGraphicSetNameMap[forthByte];
            head += 4;
          } else {
            // Designation (2-byte DRCS to G3)
            const fifthByte = buf.readUIntBE(head + 4, 1);
            designations.g3.length = 2;
            designations.g3.name = drcsGraphicSetNameMap[fifthByte];
            head += 5;
          }
        }
      }
    } else if (firstByte === 0x89) {
      // MSZ
      charSize = 'middle';
      head += 1;
    } else if (firstByte === 0x8a) {
      // NSZ
      charSize = 'normal';
      head += 1;
    }

    if (previousHead === head) {
      head += 1;
    }
  }

  return result;
}
