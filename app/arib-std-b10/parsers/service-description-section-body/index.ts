import { BinaryStructureParser } from 'binary-structure';
import { PsiSiSection } from 'arib-std-b10/parsers/psi-si-section';

interface BinaryStructure {
  transportStreamId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  originalNetworkId: number;
  services: {
    serviceId: number;
    eitCompanyDefinitionFlag: number;
    eitScheduleFlag: number;
    eitPresentFollowingFlag: number;
    runningStatus: number;
    freeCaMode: number;
    descriptorsLoopLength: number;
    descriptors: Buffer;
  }[];
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, PsiSiSection>([
  { id: 'transportStreamId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 2 },
  { id: 'versionNumber', type: 'uint', bitLength: 5 },
  { id: 'currentNextIndicator', type: 'uint', bitLength: 1 },
  { id: 'sectionNumber', type: 'uint', bitLength: 8 },
  { id: 'lastSectionNumber', type: 'uint', bitLength: 8 },
  { id: 'originalNetworkId', type: 'uint', bitLength: 16 },
  { type: 'ignore', bitLength: 8 },
  {
    id: 'services',
    type: 'array',
    bitLength: (_, c) => (c.sectionLength - 12) * 8,
    children: [
      { id: 'serviceId', type: 'uint', bitLength: 16 },
      { type: 'ignore', bitLength: 3 },
      { id: 'eitCompanyDefinitionFlag', type: 'uint', bitLength: 3 },
      { id: 'eitScheduleFlag', type: 'uint', bitLength: 1 },
      { id: 'eitPresentFollowingFlag', type: 'uint', bitLength: 1 },
      { id: 'runningStatus', type: 'uint', bitLength: 3 },
      { id: 'freeCaMode', type: 'uint', bitLength: 1 },
      { id: 'descriptorsLoopLength', type: 'uint', bitLength: 12 },
      { id: 'descriptors', type: 'raw', bitLength: (_, __, sv) => sv.descriptorsLoopLength * 8 },
    ],
  },
]);

export interface ServiceDescriptionSectionBody {
  transportStreamId: number;
  versionNumber: number;
  currentNextIndicator: number;
  sectionNumber: number;
  lastSectionNumber: number;
  originalNetworkId: number;
  services: {
    serviceId: number;
    eitCompanyDefinitionFlag: number;
    eitScheduleFlag: number;
    eitPresentFollowingFlag: number;
    runningStatus: number;
    freeCaMode: number;
    descriptors: Buffer;
  }[];
}

export function parseServiceDescriptionSectionBody(section: PsiSiSection): ServiceDescriptionSectionBody {
  return binaryStructureParser.parse(section.body, section);
}
