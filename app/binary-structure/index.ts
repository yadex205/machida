interface BinaryStructureEntity<V, C> {
  type: string;
  existsWhen?: (values: V, context: C) => boolean;
}

interface IgnoreBinaryStructureEntity<V, C> extends BinaryStructureEntity<V, C> {
  bitLength: number | ((values: V, context: C, scopedValue: any) => number);
  type: 'ignore';
}

interface RawBinaryStructureEntity<V, C> extends BinaryStructureEntity<V, C> {
  bitLength: number | ((values: V, context: C, scopedValue: any) => number);
  id: string;
  type: 'raw';
}

interface UIntBinaryStructureEntity<V, C> extends BinaryStructureEntity<V, C> {
  bitLength: number | ((values: V, context: C, scopedValue: any) => number);
  id: string;
  type: 'uint';
}

interface ArrayBinaryStructureEntity<V, C> extends BinaryStructureEntity<V, C> {
  bitLength: number | ((values: V, context: C, scopedValue: any) => number);
  children: BinaryStructure<V, C>;
  id: string;
  type: 'array';
}

interface TableBinaryStructureEntity<V, C> extends BinaryStructureEntity<V, C> {
  children: BinaryStructure<V, C>;
  id: string;
  type: 'table';
}

type AnyTypeBinaryStructureEntity<V, C> =
  | IgnoreBinaryStructureEntity<V, C>
  | RawBinaryStructureEntity<V, C>
  | UIntBinaryStructureEntity<V, C>
  | ArrayBinaryStructureEntity<V, C>
  | TableBinaryStructureEntity<V, C>;

type BinaryStructure<V, C> = Array<AnyTypeBinaryStructureEntity<V, C>>;

export class BinaryStructureParser<V = any, C = any> {
  private structure: BinaryStructure<V, C>;

  public constructor(structure: BinaryStructure<V, C>) {
    this.structure = structure;
  }

  public parse(buf: Buffer, context: C): V {
    const value: any = {};
    this.parseScoped(buf, context, this.structure, value);
    return value;
  }

  private parseScoped(
    scopedBuf: Buffer,
    context: C,
    scopedStructure: BinaryStructure<any, C>,
    entireValue: any = {},
    scopedValue: any = entireValue
  ) {
    let bitPosition = 0;

    scopedStructure.forEach(entity => {
      if (entity.existsWhen && !entity.existsWhen(entireValue, context)) {
        return;
      }

      if (entity.type === 'raw') {
        const bitLength =
          typeof entity.bitLength === 'number' ? entity.bitLength : entity.bitLength(entireValue, context, scopedValue);

        scopedValue[entity.id] = scopedBuf.slice(bitPosition / 8, bitPosition / 8 + bitLength / 8);
        bitPosition += bitLength;
      } else if (entity.type === 'ignore') {
        const bitLength =
          typeof entity.bitLength === 'number' ? entity.bitLength : entity.bitLength(entireValue, context, scopedValue);

        bitPosition += bitLength;
      } else if (entity.type === 'uint') {
        const bitLength =
          typeof entity.bitLength === 'number' ? entity.bitLength : entity.bitLength(entireValue, context, scopedValue);
        const readByteSince = Math.floor(bitPosition / 8);
        const readByteUntil = Math.ceil((bitPosition + bitLength) / 8);
        const rawReadValue = scopedBuf.readUIntBE(readByteSince, readByteUntil - readByteSince);
        scopedValue[entity.id] =
          (rawReadValue >>> (readByteUntil * 8 - (bitPosition + bitLength))) & (2 ** bitLength - 1);
        bitPosition += bitLength;
      } else if (entity.type === 'array') {
        const bitLength =
          typeof entity.bitLength === 'number' ? entity.bitLength : entity.bitLength(entireValue, context, scopedValue);
        const bitPositionUntil = bitPosition + bitLength;

        scopedValue[entity.id] = [];
        let index = 0;
        while (bitPosition < bitPositionUntil) {
          scopedValue[entity.id][index] = {};
          const nextScopedBuf = scopedBuf.slice(bitPosition / 8);
          const { readBitLength } = this.parseScoped(
            nextScopedBuf,
            context,
            entity.children,
            entireValue,
            scopedValue[entity.id][index]
          );
          bitPosition += readBitLength;

          index++;
        }
      } else if (entity.type === 'table') {
        scopedValue[entity.id] = {};
        const nextScopedBuf = scopedBuf.slice(bitPosition / 8);
        const { readBitLength } = this.parseScoped(
          nextScopedBuf,
          context,
          entity.children,
          entireValue,
          scopedValue[entity.id]
        );
        bitPosition += readBitLength;
      }
    });

    return { readBitLength: bitPosition };
  }
}
