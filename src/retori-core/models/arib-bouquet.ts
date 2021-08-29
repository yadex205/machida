import { parseBouquetAssociationSectionBody } from 'arib-b10';

export interface AribBouquet {
  bouquetId: number;
}

export const extractAribBouquetFromBouquetAssociationSection = (
  ...args: Parameters<typeof parseBouquetAssociationSectionBody>
): AribBouquet => {
  const a = parseBouquetAssociationSectionBody(...args);

  console.log(a);

  const aribBouquet: AribBouquet = {
    bouquetId: a.bouquetId,
  };

  return aribBouquet;
};
