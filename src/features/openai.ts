import { IApi } from 'konos';
import { Configuration, OpenAIApi } from 'openai';
import { PROXY_URL } from '../constants';
import assert from 'assert';

export default (api: IApi) => {
  const { apiKey } = api.args;
  api.modifyAppData((memo) => {
    const openAIKey =
      process.env.OPENAI_API_KEY || api.userConfig?.openAIKey || apiKey;
    assert(
      openAIKey,
      `
openAIKey must be configured. This can be achieved through three methods: 
1. setting environment variable process.env.OPENAI_API_KEY=you_openai_kei
2. execute commands with parameters, <command> --apiKey=you_openai_kei
3. configuring openAIKey: 'you_openai_kei' in configuration file .hzbrc.ts

openAIKey 必须设置。可以通过以下三种方式设置:

1. 设置环境变量 process.env.OPENAI_API_KEY=you_openai_kei
2. 执行命令携带参数，<command> --apiKey=you_openai_kei
3. 在配置文件 .hzbrc.ts 中设置 openAIKey: 'you_openai_kei'

`,
    );

    const config = new Configuration({
      apiKey: openAIKey,
      basePath: `${
        process.env.OPENAI_PROXY_URL || api.userConfig?.proxyUrl || PROXY_URL
      }v1`,
    });
    const openai = new OpenAIApi(config);
    memo.openai = openai;
    return memo;
  });
};
