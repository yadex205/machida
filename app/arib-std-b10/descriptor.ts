import { BinaryData } from 'binary-data';
import { BinaryStructureParser } from 'binary-structure';

interface Descriptors {
  list: {
    tag: number;
    length: number;
    body: BinaryData;
  }[];
}

export const descriptorsParser = new BinaryStructureParser<Descriptors, { totalByteLength: number }>([
  {
    id: 'list',
    type: 'array',
    bitLength: (_, c) => c.totalByteLength * 8,
    children: [
      { id: 'tag', type: 'uint', bitLength: 8 },
      { id: 'length', type: 'uint', bitLength: 8 },
      { id: 'body', type: 'binary-data', bitLength: (_, __, sv) => sv.length * 8 },
    ],
  },
]);

interface ServiceDescriporBody {
  serviceType: number;
  serviceProviderNameLength: number;
  serviceProviderName: BinaryData;
  serviceNameLength: number;
  serviceName: BinaryData;
}

export const serviceDescriptorBodyParser = new BinaryStructureParser<ServiceDescriporBody>([
  { id: 'serviceType', type: 'uint', bitLength: 8 },
  { id: 'serviceProviderNameLength', type: 'uint', bitLength: 8 },
  { id: 'serviceProviderName', type: 'binary-data', bitLength: v => v.serviceProviderNameLength * 8 },
  { id: 'serviceNameLength', type: 'uint', bitLength: 8 },
  { id: 'serviceName', type: 'binary-data', bitLength: v => v.serviceNameLength * 8 },
]);
