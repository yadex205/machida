import childProcess from 'child_process';
import { Readable } from 'stream';

export interface ListenBroadcastArgs {
  recpt1Path?: string;
  device: string;
  channel: number;
  sid?: number;
}

interface ListenBroadcastReturnType {
  stream: Readable;
  stop: () => Promise<void>;
}

export const listenBroadcast = ({ recpt1Path = 'recpt1', device, channel, sid }: ListenBroadcastArgs) =>
  new Promise<ListenBroadcastReturnType>((resolve, reject) => {
    let isStarted = false;

    const recpt1Options = ['--b25'];
    if (sid) {
      recpt1Options.push('--strip', '--sid', sid.toString(10));
    }
    recpt1Options.push('--device', device, channel.toString(10), '-', '-');

    const recpt1 = childProcess.spawn(recpt1Path, recpt1Options, {
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    const stop = () =>
      new Promise<void>(resolve => {
        const forceKillTimer = setTimeout(() => {
          recpt1.kill('SIGKILL');
        }, 5000);

        recpt1.on('exit', () => {
          clearTimeout(forceKillTimer);
          resolve();
        });
        recpt1.kill('SIGTERM');
        recpt1.stdout.emit('end');
        recpt1.stdout.destroy();
      });

    recpt1.stdout.once('data', () => {
      isStarted = true;
      resolve({
        stream: recpt1.stdout,
        stop,
      });
    });

    recpt1.on('exit', () => {
      if (!isStarted) {
        reject(new Error('Broadcast: stopped listening unexpectedly.'));
      }
    });
  });
