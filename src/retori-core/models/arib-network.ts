import { parseNetworkInformationSectionBody } from 'arib-b10';

export interface AribNetwork {
  networkId: number;
}

export const extractAribNetworkFromNetworkInformationSection = (
  ...args: Parameters<typeof parseNetworkInformationSectionBody>
): AribNetwork => {
  const { networkId } = parseNetworkInformationSectionBody(...args);

  return { networkId };
};
