import { EventEmitter } from 'events';
import { Packet } from 'arib-std-b10/parsers/packet';
import { PsiSiSection, parsePsiSiSection } from 'arib-std-b10/parsers/psi-si-section';

export class PsiSiPacketProcessor {
  private sectionFragmentBuffer?: Buffer;
  private lastContinuityCounter?: number;
  private eventEmitter = new EventEmitter();

  public on(event: 'section', callback: (section: PsiSiSection) => void): void {
    this.eventEmitter.on(event, callback);
  }

  public feed(packet: Packet): void {
    if (!packet.body) {
      return;
    }

    if (typeof this.lastContinuityCounter === 'number') {
      if (this.lastContinuityCounter === packet.continuityCounter) {
        return;
      } else if (((this.lastContinuityCounter + 1) & 0b1111) !== packet.continuityCounter) {
        this.sectionFragmentBuffer = undefined;
      }
    }

    if (this.sectionFragmentBuffer && packet.payloadUnitStartIndicator === 0) {
      this.sectionFragmentBuffer = Buffer.concat([this.sectionFragmentBuffer, packet.body]);
    } else if (!this.sectionFragmentBuffer && packet.payloadUnitStartIndicator === 1) {
      const pointerField = packet.body.readUIntBE(0, 1);
      this.sectionFragmentBuffer = packet.body.slice(1 + pointerField);
    } else if (this.sectionFragmentBuffer && packet.payloadUnitStartIndicator === 1) {
      const pointerField = packet.body.readUIntBE(0, 1);
      const firstSectionFragmentBuffer = packet.body.slice(1, 1 + pointerField);
      const completedSectionBuffer = Buffer.concat([this.sectionFragmentBuffer, firstSectionFragmentBuffer]);
      const section = parsePsiSiSection(completedSectionBuffer);

      this.sectionFragmentBuffer = packet.body.slice(1 + pointerField);

      this.eventEmitter.emit('section', section);
    }
  }

  public reset(): void {
    this.sectionFragmentBuffer = undefined;
    this.lastContinuityCounter = undefined;
  }
}
