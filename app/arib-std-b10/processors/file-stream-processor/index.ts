import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { Packet, parsePacket } from 'arib-std-b10/parsers/packet';

interface EventListenerCallbacks {
  end: () => void;
  packet: (packet: Packet) => void;
}

export class FileStreamProcessor {
  private readonly syncByte = 0x47;
  private readonly packetSize = 188;
  private readonly dataBufferActiveRegionEnoughLength = this.packetSize * 200;

  private dataBuffer = Buffer.allocUnsafe(2 * 1024 * 1024);
  private dataBufferActiveRegion = [0, 0];
  private dataBufferCurrentPosition = 0;
  private eventEmitter = new EventEmitter();
  private isStable = false;

  public constructor(readStream: Readable) {
    const applicableMaxHighWaterMark = (this.dataBuffer.length - this.dataBufferActiveRegionEnoughLength) * 0.2;

    if (readStream.readableHighWaterMark > applicableMaxHighWaterMark) {
      throw new Error(
        `Too large high water mark for readable stream. Decrease to less than ${applicableMaxHighWaterMark}`
      );
    }
    readStream.on('data', this.onReadStreamGivesData);
    readStream.on('end', () => this.eventEmitter.emit('end'));
  }

  public on = <
    E extends keyof EventListenerCallbacks,
    C extends Parameters<EventEmitter['on']>[1] = EventListenerCallbacks[E]
  >(
    eventName: E,
    callback: C
  ): void => {
    this.eventEmitter.on(eventName, callback);
  };

  private get dataBufferActiveRegionLength() {
    return this.dataBufferActiveRegion[1] - this.dataBufferActiveRegion[0];
  }

  private onReadStreamGivesData = (chunk: Buffer) => {
    if (this.dataBufferActiveRegion[1] + chunk.length >= this.dataBuffer.length) {
      if (!this.isStable) {
        this.dataBufferActiveRegion[0] = 0;
        this.dataBufferActiveRegion[1] = 0;
      } else {
        this.dataBuffer.copy(this.dataBuffer, 0, this.dataBufferCurrentPosition, this.dataBufferActiveRegion[1]);
        this.dataBufferActiveRegion[0] = 0;
        this.dataBufferActiveRegion[1] -= this.dataBufferCurrentPosition;
        this.dataBufferCurrentPosition = 0;
      }
    }

    chunk.copy(this.dataBuffer, this.dataBufferActiveRegion[1]);
    this.dataBufferActiveRegion[1] += chunk.length;

    if (!this.isStable && this.dataBufferActiveRegionLength >= this.dataBufferActiveRegionEnoughLength) {
      for (let byteIndex = this.dataBufferActiveRegion[0]; byteIndex < this.dataBufferActiveRegion[1]; byteIndex++) {
        if (this.dataBuffer[byteIndex] === this.syncByte) {
          let isPacketHeadFound = true;
          for (
            let packetIndex = 1;
            byteIndex + packetIndex * this.packetSize < this.dataBufferActiveRegion[1];
            packetIndex++
          ) {
            if (this.dataBuffer[byteIndex + packetIndex * this.packetSize] !== this.syncByte) {
              isPacketHeadFound = false;
              break;
            }
          }
          if (isPacketHeadFound) {
            this.isStable = true;
            this.dataBufferCurrentPosition = byteIndex;
            break;
          }
        }
      }
    }

    if (this.isStable) {
      const initialDataBufferCurrentPosition = this.dataBufferCurrentPosition;
      const parseSubjectDataBuffer = Buffer.from(
        this.dataBuffer.slice(this.dataBufferCurrentPosition, this.dataBufferActiveRegion[1])
      );

      for (
        ;
        this.dataBufferCurrentPosition <= this.dataBufferActiveRegion[1] - this.packetSize;
        this.dataBufferCurrentPosition += this.packetSize
      ) {
        if (this.dataBuffer[this.dataBufferCurrentPosition] !== this.syncByte) {
          this.isStable = false;
          this.dataBufferActiveRegion[0] = 0;
          this.dataBufferActiveRegion[1] = 0;
          break;
        }

        const offset = this.dataBufferCurrentPosition - initialDataBufferCurrentPosition;
        const buf = parseSubjectDataBuffer.slice(offset, offset + this.packetSize);
        const packet = parsePacket(buf);
        this.eventEmitter.emit('packet', packet);
      }
    }
  };
}
