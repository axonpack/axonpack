#!/usr/bin/env node
require('../build/cli.cjs')
  .main(process.argv.slice(2))
  // Exit once both streams have drained: exiting at once can cut off a long reply going to a pipe.
  .then((code) =>
    process.stdout.write('', () => process.stderr.write('', () => process.exit(code)))
  );
