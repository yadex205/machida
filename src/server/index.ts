// import { ListenBroadcastToUpdateDatabaseWorker } from 'server/workers/listen-broadcast-to-update-database-worker';

// new ListenBroadcastToUpdateDatabaseWorker().run({ device: '/dev/px4video2' });

import fastifyFactory from 'fastify';

const fastify = fastifyFactory();

fastify.get(/);

fastify.listen(20561);
