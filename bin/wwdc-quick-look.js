#!/usr/bin/env node

import { main } from '../src/wwdc-quick-look/cli.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
