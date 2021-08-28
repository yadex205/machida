import { Tuner } from './tuner';
import { getConfig } from './config';

export class Retori {
  public initialize = async () => {
    // TODO: This class shouldn't use getConfig by itself.
    const config = await getConfig();
  };
}
