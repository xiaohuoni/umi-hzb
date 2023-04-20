import { IApi } from 'konos';

export default (api: IApi) => {
  return {
    plugins: [
      // config
      require.resolve('./config/config'),
      // features
      require.resolve('./features/openai'),

      // commands
      require.resolve('./commands/ask'),
      require.resolve('./commands/scraped'),

      // inits
      require.resolve('./inits/demo'),
    ].filter(Boolean),
  };
};
