import { Tuner } from './tuner';
import { getConfig } from './config';

class Retori {
  private tuners?: Tuner[];

  public initialize = async () => {
    const config = await getConfig();
    const tuners = config.tuners.map(tunerRawData => {
      return new Tuner(tunerRawData);
    });

    this.tuners = tuners;
  };

  public getAvailableTuner = (type: 'GR' | 'BS' | 'CS') => {
    return this.tuners?.find(tuner => {
      return tuner.types.includes(type) && !tuner.isRunning;
    });
  };
}
