function parseTimeBCDtoHMS(rawData: number): { hours: number; minutes: number; seconds: number } {
  return {
    hours: ((rawData >>> 20) & 0b1111) * 10 + ((rawData >>> 16) & 0b1111),
    minutes: ((rawData >>> 12) & 0b1111) * 10 + ((rawData >>> 8) & 0b1111),
    seconds: ((rawData >>> 4) & 0b1111) * 10 + ((rawData >>> 0) & 0b1111),
  };
}

export function parseDurationSeconds(buf: Buffer): number | undefined {
  const rawData = buf.readUIntBE(0, 3);
  if (rawData === 0xffffff) {
    return undefined;
  }

  const { hours, minutes, seconds } = parseTimeBCDtoHMS(rawData);
  return hours * 24 * 60 + minutes * 60 + seconds;
}

export function parseDate(buf: Buffer): Date | undefined {
  if (buf.readUIntBE(0, 5) === 0xffffffffff) {
    return undefined;
  }

  const mjd = buf.readUIntBE(0, 2);
  const timeBCD = buf.readUIntBE(2, 3);

  const year$ = Math.trunc((mjd - 15078.2) / 365.25);
  const month$ = Math.trunc((mjd - 14956.1 - Math.trunc(year$ * 365.25)) / 30.6001);
  const day = mjd - 14956 - Math.trunc(year$ * 365.25) - Math.trunc(month$ * 30.6001);
  const k = month$ === 14 || month$ === 15 ? 1 : 0;
  const year = year$ + k + 1900;
  const month = month$ - 1 - k * 12;
  const { hours, minutes, seconds } = parseTimeBCDtoHMS(timeBCD);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) - 9 * 3600 * 1000);
}
