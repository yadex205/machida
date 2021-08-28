import childProcess, { ChildProcessByStdio } from 'child_process';
import EventEmitter from 'events';
import { Readable } from 'stream';

import Mustache from 'mustache';
import { parseArgsStringToArgv } from 'string-argv';

interface TunerConstructorArgs {
  name: string;
  types: ('GR' | 'BS' | 'CS')[];
  commands: {
    allServicesToStdout: string;
    singleServiceToStdout: string;
  };
}

export class Tuner extends EventEmitter {
  private static _tuners: Tuner[] = [];
  private static reservedTuners = new Set<Tuner>();
  public readonly name: TunerConstructorArgs['name'];
  public readonly types: TunerConstructorArgs['types'];
  public readonly commands: TunerConstructorArgs['commands'];
  private process?: ChildProcessByStdio<null, Readable, null>;

  public static findAvailableTuner = (tunerType: 'GR' | 'BS' | 'CS') => {
    return this._tuners.find(tuner => {
      return tuner.types.includes(tunerType) && !this.reservedTuners.has(tuner) && !tuner.isRunning;
    });
  };

  public static register = (args: TunerConstructorArgs) => {
    const newTuner = new Tuner(args);
    this._tuners.push(newTuner);
  };

  public static occupy = (tuner: Tuner) => {
    this.reservedTuners.add(tuner);
  };

  public static release = (tuner: Tuner) => {
    this.reservedTuners.delete(tuner);
  };

  private constructor(args: TunerConstructorArgs) {
    super();

    this.name = args.name;
    this.types = args.types;
    this.commands = args.commands;
  }

  public start = (channel: number, sid?: number) => {
    let args = '';

    if (typeof sid !== 'number') {
      args = Mustache.render(this.commands.allServicesToStdout, { channel });
    } else {
      args = Mustache.render(this.commands.singleServiceToStdout, { channel, sid });
    }

    const [binName, ...argv] = parseArgsStringToArgv(args);

    return new Promise<void>((resolve, reject) => {
      let isStarted = false;
      const process = childProcess.spawn(binName, argv, { stdio: ['ignore', 'pipe', 'inherit'] });
      const unexpectedExithandler = () => {
        if (!isStarted) {
          reject(new Error('Tuner process exited unexpectedly.'));
        }
      };
      process.once('exit', unexpectedExithandler);

      process.stdout.once('data', () => {
        isStarted = true;
        this.process = process;
        process.removeListener('exit', unexpectedExithandler);
        process.on('exit', () => this.emit('stop'));
        resolve();
      });
    });
  };

  public stop = () => {
    const process = this.process;

    return new Promise<void>(resolve => {
      if (!process || process.killed) {
        this.process = undefined;
        resolve();
      } else {
        const forceKillTimer = global.setTimeout(() => {
          process.kill();
        }, 5000);

        process.on('exit', () => {
          global.clearTimeout(forceKillTimer);
          this.process = undefined;
          resolve();
        });

        process.kill('SIGTERM');
        process.stdout.emit('end');
        process.stdout.destroy();
      }
    });
  };

  public override on = (event: 'stop', callback: () => void) => {
    return super.on(event, callback);
  };

  public get isRunning() {
    return !!this.process && !this.process.killed;
  }

  public get readableStream() {
    if (this.process?.killed) {
      return undefined;
    }

    return this.process?.stdout;
  }
}
