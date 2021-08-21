import childProcess from 'child_process';
import { Readable } from 'stream';

interface RunRecpt1Options {
  channel: number;
  device: string;
}

interface RunRecpt1ReturnType {
  stdout: Readable;
  kill: () => Promise<void>;
}

export const runRecpt1 = (options: RunRecpt1Options) => {
  return new Promise<RunRecpt1ReturnType>((resolve, reject) => {
    let started = false;
    const proc = childProcess.spawn(
      `recpt1`,
      ['--b25', '--device', options.device, options.channel.toString(10), '-', '-'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    proc.stderr.pipe(process.stderr);

    proc.stderr.on('data', (_chunk: Buffer | string) => {
      const chunk = _chunk.toString();
      if (chunk.match(/Recording/)) {
        started = true;
        resolve({
          stdout: proc.stdout,
          kill: () => {
            return new Promise<void>(resolve => {
              proc.on('exit', () => resolve());

              proc.stderr.on('data', (chunk: string | Buffer) => {
                if (chunk.toString().match(/cleaning up/)) {
                  proc.stdout.emit('end');
                  proc.stdout.destroy();
                }
              });

              proc.kill('SIGTERM');
            });
          },
        });
      }
    });

    proc.on('exit', () => {
      if (!started) {
        reject();
      }
    });
  });
};
