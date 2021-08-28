import { Retori } from 'retori-core';
import { UpdateTerrestrialEpgWorker } from 'retori-core/workers/update-terrestrial-epg-worker';

(async () => {
  const retori = new Retori();
  await retori.initialize();

  const worker = new UpdateTerrestrialEpgWorker();
  await worker.perform();
})();
