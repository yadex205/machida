import childProcess from 'child_process';

import { Tuner } from 'retori-core/tuner';

jest.mock('child_process');
const mockedChildProcessSpawn = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;

beforeEach(() => {
  mockedChildProcessSpawn.mockClear();
});

describe('Tuner', () => {
  describe('#start', () => {
    describe('when only channel argument is provided', () => {
      describe('when a valid allServicesToStdout command string is provided', () => {
        it('should spawn a tuner method', () => {
          const tuner = new Tuner({
            name: 'test',
            types: ['GR'],
            commands: {
              allServicesToStdout: 'all-services-to-stdout-command --opt1 --opt2 opt2val {{channel}} val1 val2',
              singleServiceToStdout: 'single-service-to-stdout-command {{channel}} {{sid}}',
            },
          });
          tuner.start(1);

          expect(mockedChildProcessSpawn).toHaveBeenCalledWith(
            'all-services-to-stdout-command',
            ['--opt1', '--opt2', 'opt2val', '1', 'val1', 'val2'],
            expect.anything()
          );
        });
      });
    });

    describe('when both channel and sid arguments are provided', () => {
      describe('when a valid singleServiceToStdout command string is provided', () => {
        it('should spawn a tuner method', () => {
          const tuner = new Tuner({
            name: 'test',
            types: ['GR'],
            commands: {
              allServicesToStdout: 'all-services-to-stdout-command --opt1 --opt2 opt2val {{channel}} val1 val2',
              singleServiceToStdout:
                'single-service-to-stdout-command --opt1 --opt2 --opt3 opt3val --opt4 {{sid}} {{channel}} val1 val2',
            },
          });
          tuner.start(1, 1000);

          expect(mockedChildProcessSpawn).toHaveBeenCalledWith(
            'single-service-to-stdout-command',
            ['--opt1', '--opt2', '--opt3', 'opt3val', '--opt4', '1000', '1', 'val1', 'val2'],
            expect.anything()
          );
        });
      });
    });
  });
});
