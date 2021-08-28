import { Config } from '@jest/types';

export default {
  modulePaths: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  rootDir: __dirname,
  testMatch: ['**/specs/**/*.spec.ts?(x)'],
} as Config.InitialOptions;
