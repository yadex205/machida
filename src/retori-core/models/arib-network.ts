import {
  parseNetworkInformationSectionBody,
  parseDescriptors,
  parseNetworkNameDescriptorBody,
  parseServiceListDescriptorBody,
} from 'arib-b10';

export interface AribNetwork {
  networkId: number;
  name: string;
  services: {
    serviceId: number;
    serviceType: number;
  }[];
}

export const extractAribNetworkFromNetworkInformationSection = (
  ...args: Parameters<typeof parseNetworkInformationSectionBody>
): AribNetwork => {
  const { networkId, descriptors: descriptorsRawData } = parseNetworkInformationSectionBody(...args);

  const aribNetwork: AribNetwork = {
    networkId,
    name: '',
    services: [],
  };

  parseDescriptors(descriptorsRawData).forEach(descriptor => {
    if (descriptor.tag === 0x40) {
      const { networkName } = parseNetworkNameDescriptorBody(descriptor);
      aribNetwork.name = networkName;
    } else if (descriptor.tag === 0x41) {
      const { serviceList } = parseServiceListDescriptorBody(descriptor);
      serviceList.forEach(({ serviceId, serviceType }) => {
        aribNetwork.services.push({ serviceId, serviceType });
      });
    } else if (descriptor.tag === 0xcd) {
      console.log(
        'TS情報記述子あった！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！'
      );
    }
  });

  return aribNetwork;
};
