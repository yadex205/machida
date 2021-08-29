import { parseAribStdB24 } from 'arib-b24';
import { BinaryStructureParser } from 'binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  networkName: Buffer;
}

const binaryStructureParser = new BinaryStructureParser<BinaryStructure, Descriptor>([
  { id: 'networkName', type: 'raw', bitLength: (_, c) => c.length * 8 },
]);

interface NetworkNameDescriptorBody {
  networkName: string;
}

export const parseNetworkNameDescriptorBody = (descriptor: Descriptor): NetworkNameDescriptorBody => {
  const { networkName } = binaryStructureParser.parse(descriptor.body, descriptor);
  return {
    networkName: parseAribStdB24(networkName),
  };
};
