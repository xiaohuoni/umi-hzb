import { IApi } from 'konos';

export default (api: IApi) => {
  //@ts-ignore
  const isKonos = api.service.opts.frameworkName === 'kono';
  return {
    plugins: [
      // config
      require.resolve('./config/hzbconfig'),
      // features
      require.resolve('./features/openai'),

      // commands
      require.resolve('./commands/ask'),
      require.resolve('./commands/scraped'),

      // inits
      isKonos && require.resolve('./inits/demo'),
    ].filter(Boolean),
  };
};
