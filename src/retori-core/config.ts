import path from 'path';

import Conf from 'conf';

export interface RetoriConfig {
  server: {
    port: number;
  };
  transcode: {
    commands: {
      stdioToHls: string;
    };
  };
  tuners: {
    name: string;
    types: ('GR' | 'BS' | 'CS')[];
    commands: {
      allServicesToStdout: string;
      singleServiceToStdout: string;
    };
  }[];
}

const configHandler = new Conf<RetoriConfig>({
  schema: {
    server: {
      type: 'object',
      additionalProperties: false,
      properties: {
        port: {
          type: 'number',
          default: 20561,
        },
      },
    },
    transcode: {
      type: 'object',
      additionalProperties: false,
      properties: {
        commands: {
          type: 'object',
          additionalProperties: false,
          properties: {
            stdioToHls: {
              type: 'string',
            },
          },
        },
      },
    },
    tuners: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'types', 'commands'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['GR', 'BS', 'CS'],
            },
          },
          commands: {
            type: 'object',
            additionalProperties: false,
            required: ['allServicesToStdout', 'singleServiceToStdout'],
            properties: {
              allServicesToStdout: {
                type: 'string',
              },
              singleServiceToStdout: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  },
});

// @TODO Implement correct resolver
const resolveConfigPath = () => path.join(process.cwd(), 'retori.config.json');

let cachedConfig: RetoriConfig;

export const getConfig = async () => {
  if (cachedConfig) {
    return cachedConfig;
  } else {
    const configPath = resolveConfigPath();
    const rawConfig = await import(configPath);
    configHandler.set(rawConfig);

    return (cachedConfig = configHandler.store);
  }
};
