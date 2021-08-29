import { BinaryStructureParser } from 'binary-structure';

import { PsiSiSection } from './psi-si-section';

interface BinaryStructure {
  bouquetId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  descriptorsByteLength: number;
  descriptorsRawData: Buffer;
  transportStreamsByteLength: number;
  transportStreams: {
    transportStreamId: number;
    originalNetworkId: number;
    descriptorsByteLength: number;
    descriptorsRawData: Buffer;
  }[];
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, PsiSiSection>([
  { id: 'bouquetId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  { type: 'ignore', bitLength: 4 },
  { id: 'descriptorsByteLength', type: 'uint', bitLength: 12 },
  { id: 'descriptorsRawData', type: 'raw', bitLength: c => c.descriptorsByteLength * 8 },
  { type: 'ignore', bitLength: 4 },
  { id: 'transportStreamsByteLength', type: 'raw', bitLength: 12 },
  {
    id: 'transportStreams',
    type: 'array',
    bitLength: c => c.transportStreamsByteLength * 8,
    children: [
      { id: 'transportStreamId', type: 'uint', bitLength: 16 },
      { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 4 },
      { id: 'descriptorsByteLength', type: 'uint', bitLength: 12 },
      { id: 'descriptorsRawData', type: 'raw', bitLength: (_, __, sv) => sv.descriptorsByteLength * 8 },
    ],
  },
]);

export interface BouquetAssociationSectionBody {
  bouquetId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  descriptorsRawData: Buffer;
  transportStreams: {
    transportStreamId: number;
    originalNetworkId: number;
    descriptorsRawData: Buffer;
  }[];
}

export const parseBouquetAssociationSectionBody = (section: PsiSiSection): BouquetAssociationSectionBody => {
  return binaryStructureParser.parse(section.body, section);
};
