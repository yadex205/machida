import childProcess, { ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { Readable } from 'stream';

import Mustache from 'mustache';

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

  public start() {}

  public stop() {}

  public override on = (event: 'data', callback: (chunk: Buffer) => void) => {
    return super.on(event, callback);
  };

  public get isRunning() {
    return !!this.process && !this.process.killed;
  }
}
