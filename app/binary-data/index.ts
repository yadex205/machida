export interface BinaryData {
  buf: Buffer;
  byteOffset: number;
  byteLength: number;
}

export function sliceBinaryData(
  bin: BinaryData,
  byteOffset: number,
  byteLength: number = bin.byteLength - byteOffset
): BinaryData {
  return { buf: bin.buf, byteOffset: bin.byteOffset + byteOffset, byteLength };
}

export function getNativeBufferOfBinaryData(bin: BinaryData): Buffer {
  return bin.buf.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
}
