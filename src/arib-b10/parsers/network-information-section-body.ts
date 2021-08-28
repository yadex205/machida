import { BinaryStructureParser } from 'binary-structure';

import { PsiSiSection } from './psi-si-section';

interface BinaryStructure {
  networkId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  descriptorsLength: number;
  descriptors: Buffer;
  transportStreamsLength: number;
  transportStreams: {
    transportStreamId: number;
    originalNetworkId: number;
    DescriptorsLength: number;
    descriptors: Buffer;
  }[];
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, PsiSiSection>([
  { id: 'networkId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  { type: 'ignore', bitLength: 4 },
  { id: 'descriptorsLength', type: 'uint', bitLength: 12 },
  { id: 'descriptors', type: 'raw', bitLength: v => v.descriptorsLength * 8 },
  { type: 'ignore', bitLength: 4 },
  { id: 'transportStreamsLength', type: 'uint', bitLength: 12 },
  {
    id: 'transportStreams',
    type: 'array',
    bitLength: v => v.transportStreamsLength * 8,
    children: [
      { id: 'transportStreamId', type: 'uint', bitLength: 16 },
      { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 4 },
      { id: 'descriptorsLength', type: 'uint', bitLength: 12 },
      { id: 'descriptors', type: 'raw', bitLength: (_, __, sv) => sv.descriptorsLength * 8 },
    ],
  },
]);

export interface NetworkInformationSectionBody {
  networkId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  descriptors: Buffer;
  transportStreams: {
    transportStreamId: number;
    originalNetworkId: number;
    descriptors: Buffer;
  }[];
}

export function parseNetworkInformationSectionBody(section: PsiSiSection): NetworkInformationSectionBody {
  return binaryStructureParser.parse(section.body, section);
}
