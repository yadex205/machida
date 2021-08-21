import { parseAribStdB24 } from 'lib/arib-std-b24';
import { BinaryStructureParser } from 'lib/binary-structure';

import { Descriptor } from './descriptors';

interface BinaryStructure {
  serviceType: number;
  serviceProviderNameLength: number;
  serviceProviderName: Buffer;
  serviceNameLength: number;
  serviceName: Buffer;
}

export const binaryStructureParser = new BinaryStructureParser<BinaryStructure>([
  { id: 'serviceType', type: 'uint', bitLength: 8 },
  { id: 'serviceProviderNameLength', type: 'uint', bitLength: 8 },
  { id: 'serviceProviderName', type: 'raw', bitLength: v => v.serviceProviderNameLength * 8 },
  { id: 'serviceNameLength', type: 'uint', bitLength: 8 },
  { id: 'serviceName', type: 'raw', bitLength: v => v.serviceNameLength * 8 },
]);

interface ServiceDescriptorBody {
  serviceType: number;
  serviceProviderName: string;
  serviceName: string;
}

export function parseServiceDescriptorBody(descriptor: Descriptor): ServiceDescriptorBody {
  const { serviceType, serviceProviderName, serviceName } = binaryStructureParser.parse(descriptor.body, {});

  return {
    serviceType,
    serviceProviderName: parseAribStdB24(serviceProviderName),
    serviceName: parseAribStdB24(serviceName),
  };
}
