import parse from 'csv-parse';
import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';

const jisx0213Table: Record<number, string> = {};
const jisx0213TableResourceFile = resolve(__dirname, '../resources/jisx0213-2004-8bit-std.txt');
const jisx0213TableTsFile = resolve(__dirname, '../app/arib-std-b24/jisx0213.ts');
const jisx0213TableParser = parse({
  columns: ['jis', 'unicode'],
  comment: '#',
  delimiter: '\t',
  from: 0,
  ignore_last_delimiters: true,
  skip_empty_lines: true,
  skip_lines_with_error: true,
  trim: true,
});
const jisx0213TableTsFileWriter = createWriteStream(jisx0213TableTsFile);

jisx0213TableTsFileWriter.write('export const jisx0213Table: Record<number, string> = {\n');

jisx0213TableParser.on('readable', () => {
  let record: any = undefined;
  while ((record = jisx0213TableParser.read())) {
    if (!record.unicode) {
      continue;
    }
    const jisCode = parseInt(record.jis, 16);
    const char = String.fromCodePoint.apply(
      null,
      (record.unicode as string)
        .replace(/^U\+/, '')
        .split(/\+/)
        .map(hexStr => parseInt(hexStr, 16))
    );
    jisx0213Table[jisCode] = char;
    jisx0213TableTsFileWriter.write(`  ${jisCode.toString(10)}: ${JSON.stringify(char)},\n`);
  }
});
jisx0213TableParser.on('end', () => {
  jisx0213TableTsFileWriter.write('};\n');
  jisx0213TableTsFileWriter.close();
});

const jisx0213TableReadStream = createReadStream(jisx0213TableResourceFile);
jisx0213TableReadStream.pipe(jisx0213TableParser);
