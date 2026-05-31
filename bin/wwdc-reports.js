#!/usr/bin/env node

import { main } from '../src/wwdc-reports/cli.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
