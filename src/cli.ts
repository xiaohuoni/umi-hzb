import { run } from 'umi';

run({
  presets: [require.resolve('./preset-hzb')],
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
