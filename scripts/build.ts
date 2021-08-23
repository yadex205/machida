import path from 'path';

import * as esbuild from 'esbuild';

const ROOT_DIR = path.join(__dirname, '../');

(async () => {
  const builds: Promise<esbuild.BuildResult>[] = [];

  builds.push(
    esbuild.build({
      entryPoints: [path.join(ROOT_DIR, 'packages/retori-binary-structure/src/index.ts')],
      outfile: path.join(ROOT_DIR, 'packages/retori-binary-structure/lib/index.js'),
      write: true,
      allowOverwrite: true,

      platform: 'node',
      target: 'node16',
      format: 'cjs',
      minify: true,
    })
  );

  Promise.all(builds);
})();
