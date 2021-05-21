import { BinaryStructureParser } from 'binary-structure';

interface BinaryStructure {
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
  body?: Buffer;
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure>([
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
    type: 'raw',
    existsWhen: v => (v.adaptationFieldControl & 0b01) > 0,
    bitLength: v =>
      8 *
      (184 -
        (typeof v.adaptationField?.adaptationFieldLength === 'number'
          ? 1 + v.adaptationField.adaptationFieldLength
          : 0)),
  },
]);

export type Packet = BinaryStructure;

export function parsePacket(buf: Buffer): Packet {
  return binaryStructureParser.parse(buf, {});
}
