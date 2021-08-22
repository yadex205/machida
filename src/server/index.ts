import { ListenBroadcastToUpdateDatabaseWorker } from 'server/workers/listen-broadcast-to-update-database-worker';

new ListenBroadcastToUpdateDatabaseWorker().run({ device: '/dev/px4video2' });
