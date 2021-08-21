import { BinaryStructureParser } from 'lib/binary-structure';

import { PsiSiSection } from './psi-si-section';

interface BinaryStructure {
  transportStreamId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  pids: {
    broadcastingProgramNumberId: number;
    pid: number;
  }[];
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, PsiSiSection>([
  { id: 'transportStreamId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  {
    id: 'pids',
    type: 'array',
    bitLength: (_, c) => (c.sectionLength - 9) * 8,
    children: [
      { id: 'broadcastingProgramNumberId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 3 },
      { id: 'pid', type: 'uint', bitLength: 13 },
    ],
  },
]);

export type ProgramAssociationSectionBody = BinaryStructure;

export function parseProgramAssociationSectionBody(section: PsiSiSection): ProgramAssociationSectionBody {
  return binaryStructureParser.parse(section.body, section);
}
