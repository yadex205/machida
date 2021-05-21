import { BinaryStructureParser } from 'binary-structure';

interface BinaryStructure {
  tableId: number;
  sectionSyntaxIndicator: number;
  sectionLength: number;
  body: Buffer;
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure>([
  { id: 'tableId', type: 'uint', bitLength: 8 },
  { id: 'sectionSyntaxIndicator', type: 'uint', bitLength: 1 },
  { type: 'ignore', bitLength: 3 },
  { id: 'sectionLength', type: 'uint', bitLength: 12 },
  { id: 'body', type: 'raw', bitLength: ({ sectionLength }) => sectionLength * 8 },
]);

export type PsiSiSection = BinaryStructure;

export function parsePsiSiSection(buf: Buffer): PsiSiSection {
  return binaryStructureParser.parse(buf, {});
}
