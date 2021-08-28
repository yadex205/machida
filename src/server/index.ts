// import { ListenBroadcastToUpdateDatabaseWorker } from 'server/workers/listen-broadcast-to-update-database-worker';

// new ListenBroadcastToUpdateDatabaseWorker().run({ device: '/dev/px4video2' });

import fastifyFactory from 'fastify';

import { getConfig } from 'retori-config';

(async () => {
  const config = await getConfig();
})();
//
// const fastify = fastifyFactory();
//
// fastify.get(/);
//
// fastify.listen(20561);
