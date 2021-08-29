import { parseServiceDescriptionSectionBody, parseServiceDescriptorBody, parseDescriptors } from 'arib-b10';

export interface AribService {
  originalNetworkId: number;
  transportStreamId: number;
  serviceId: number;
  name?: string;
  serviceType?: number;
  serviceProviderName?: string;
}

export const extractAribServicesFromServiceDescriptionSection = (
  ...args: Parameters<typeof parseServiceDescriptionSectionBody>
): AribService[] => {
  const result: AribService[] = [];

  const {
    originalNetworkId,
    transportStreamId,
    services: servicesRawData,
  } = parseServiceDescriptionSectionBody(...args);

  servicesRawData.forEach(({ serviceId, descriptors: descriptorsRawData }) => {
    parseDescriptors(descriptorsRawData).forEach(descriptor => {
      if (descriptor.tag === 0x48) {
        const { serviceName, serviceType, serviceProviderName } = parseServiceDescriptorBody(descriptor);

        result.push({
          originalNetworkId,
          transportStreamId,
          serviceId,
          name: serviceName,
          serviceType,
          serviceProviderName,
        });
      }
    });
  });

  return result;
};
