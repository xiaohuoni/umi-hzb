// re-parse cli args to process boolean flags, for get the lint-staged args
import { yParser } from '@umijs/utils';

const args = yParser(process.argv.slice(3), {
  boolean: ['quiet', 'fix', 'eslint-only', 'stylelint-only'],
});

if (args._.length === 0) {
  args._.unshift('{packages,examples}/**/*.{js,jsx,ts,tsx,less,css}');
}

// lazy require for CLI performance
require('@umijs/lint').default({ cwd: process.cwd() }, args);
