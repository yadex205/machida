import { parseAribStdB24 } from '../../../arib-std-b24';
import { Descriptor } from '../../parsers/descriptors';
import { parseExtendedEventDescriptorBody } from '../../parsers/extended-event-descriptor-body';

interface ProcessedExtendedEventDescriptorBody {
  iso639LanguageCode: string;
  items: {
    itemDescription: string;
    item: string;
  }[];
  text: string;
}

export class ExtendedEventDescriptorProcessor {
  private isProcessing = false;
  private currentIndex = -1;
  private lastIndex = 0;
  private currentLanguageCode = '';
  private items: { itemDescription: string; item: string }[] = [];
  private currentItemDescription = '';
  private currentItemBuffer = Buffer.from('');
  private text = Buffer.from('');

  public feed = (descriptor: Descriptor): ProcessedExtendedEventDescriptorBody | undefined => {
    const { descriptorNumber, lastDescriptorNumber, iso639LanguageCode, items, text } =
      parseExtendedEventDescriptorBody(descriptor);

    if (descriptorNumber === 0) {
      this.isProcessing = true;
      this.currentIndex = descriptorNumber;
      this.lastIndex = lastDescriptorNumber;
      this.currentLanguageCode = iso639LanguageCode;
      this.items = [];
      this.currentItemDescription = '';
      this.currentItemBuffer = Buffer.from('');
      this.text = text;
      this.feedItems(items);
    } else if (
      this.isProcessing &&
      descriptorNumber === this.currentIndex + 1 &&
      lastDescriptorNumber === this.lastIndex &&
      iso639LanguageCode === this.currentLanguageCode
    ) {
      this.currentIndex = descriptorNumber;
      this.text = Buffer.concat([this.text, text]);
      this.feedItems(items);
    } else {
      this.isProcessing = false;
      return undefined;
    }

    if (descriptorNumber === lastDescriptorNumber) {
      if (this.currentItemDescription && this.currentItemBuffer.length > 0) {
        this.items.push({
          itemDescription: this.currentItemDescription,
          item: parseAribStdB24(this.currentItemBuffer),
        });
      }
      return {
        iso639LanguageCode: this.currentLanguageCode,
        items: this.items,
        text: parseAribStdB24(this.text),
      } as ProcessedExtendedEventDescriptorBody;
    }

    return undefined;
  };

  private feedItems(items: { itemDescription: string; item: Buffer }[]) {
    for (let index = 0; index < items.length; index++) {
      const { itemDescription, item } = items[index];

      if (itemDescription && itemDescription !== this.currentItemDescription) {
        if (this.currentItemDescription && this.currentItemBuffer.length > 0) {
          this.items.push({
            itemDescription: this.currentItemDescription,
            item: parseAribStdB24(this.currentItemBuffer),
          });
        }

        this.currentItemDescription = itemDescription;
        this.currentItemBuffer = item;
      } else if (!itemDescription || itemDescription === this.currentItemDescription) {
        this.currentItemBuffer = Buffer.concat([this.currentItemBuffer, item]);
      } else {
        this.currentItemDescription = '';
        this.currentItemBuffer = Buffer.from('');
      }
    }
  }
}
