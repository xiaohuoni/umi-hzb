import { join } from 'path';
import { IApi, InitType } from 'konos';

export default (api: IApi) => {
  api.describe({
    key: 'inits:demo',
  });

  api.registerInit({
    key: 'demo',
    name: 'demo',
    description: '初始化框架包',
    template: join(__dirname, '..', '..', 'templates', 'demo'),
    type: InitType.init,
    questions: [],
  });
};
