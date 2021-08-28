import childProcess, { ChildProcess } from 'child_process';
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
  public readonly name: TunerConstructorArgs['name'];
  public readonly types: TunerConstructorArgs['types'];
  public readonly commands: TunerConstructorArgs['commands'];
  private process?: ChildProcess;

  public constructor(args: TunerConstructorArgs) {
    super();

    this.name = args.name;
    this.types = args.types;
    this.commands = args.commands;
  }

  public start(channel: number, sid?: number) {
    let args = '';

    if (typeof sid !== 'number') {
      args = Mustache.render(this.commands.allServicesToStdout, { channel });
    } else {
      args = Mustache.render(this.commands.singleServiceToStdout, { channel, sid });
    }

    const [binName, ...argv] = parseArgsStringToArgv(args);

    this.process = childProcess.spawn(binName, argv, { stdio: ['ignore', 'pipe', 'inherit'] });
  }

  public stop() {}

  public override on = (event: 'data', callback: (chunk: Buffer) => void) => {
    return super.on(event, callback);
  };

  public get isRunning() {
    return !!this.process && !this.process.killed;
  }
}
