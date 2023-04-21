import { IApi } from 'umi';

export default (api: IApi) => {
  //@ts-ignore
  return {
    plugins: [
      // config
      require.resolve('./config/hzbconfig'),
      // features
      require.resolve('./features/openai'),

      // commands
      require.resolve('./commands/ask'),
      require.resolve('./commands/scraped'),
      require.resolve('konos/dist/commands/init'),

      // inits
      require.resolve('./inits/demo'),
    ].filter(Boolean),
  };
};
