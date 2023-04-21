import { logger } from '@umijs/utils';
import { type AxiosResponse } from 'axios';
import {
  Configuration,
  OpenAIApi,
  type ConfigurationParameters,
  type CreateChatCompletionRequest,
  type CreateChatCompletionResponse,
  type CreateEmbeddingRequest,
  type CreateEmbeddingResponse,
} from 'openai';
import { PROXY_URL } from './constants';

interface IOpenAiInstance extends OpenAIApi {}

export interface HConfigurationParameters extends ConfigurationParameters {
  proxy?: string;
  disableProxy?: boolean;
}

export interface HCreateEmbeddingRequest
  extends Omit<CreateEmbeddingRequest, 'model'> {
  model?: string;
}
export interface HCreateChatCompletionRequest
  extends Omit<CreateChatCompletionRequest, 'model'> {
  model?: string;
}

export interface AskParameters {
  type: string;
  payload: HCreateEmbeddingRequest | HCreateChatCompletionRequest;
}

// 单例
let openAiInstance: IOpenAiInstance;
let openAiConfig: HConfigurationParameters = {};

const getOpenAi = (): OpenAIApi => {
  if (openAiInstance) {
    return openAiInstance;
  }
  const defaultProxy = process.env.OPENAI_PROXY_URL || PROXY_URL;

  const {
    apiKey,
    proxy = defaultProxy,
    disableProxy = false,
    ...other
  } = openAiConfig;

  const openAIKey = process.env.OPENAI_API_KEY || apiKey;
  if (!openAIKey) {
    logger.error(
      `
  openAIKey must be configured. This can be achieved through two methods: 
  1. setting environment variable process.env.OPENAI_API_KEY=you_openai_kei
  2. configuring @hzb-design/core.setOpenAiConfig({ apiKey: 'you_openai_kei' })
  
  openAIKey 必须设置。可以通过以下2种方式设置:
  
  1. 设置环境变量 process.env.OPENAI_API_KEY=you_openai_kei
  2. 通过 @hzb-design/core.setOpenAiConfig({ apiKey: 'you_openai_kei' }) 设置 
  `,
    );
    return openAiInstance;
  }

  const config = new Configuration({
    ...other,
    apiKey: openAIKey,
    basePath: `${disableProxy ? 'https://api.openai.com/' : proxy}v1`,
  });

  openAiInstance = new OpenAIApi(config);
  return openAiInstance;
};

// 注意：不一定需要先调用 setOpenAiConfig 如果有环境变量，不设置也可以正常跑
const setOpenAiConfig = (config: HConfigurationParameters) => {
  openAiConfig = config;
};

const getOpenAiConfig = () => {
  return openAiConfig;
};

const askAi = async ({
  type,
  payload,
}: AskParameters): Promise<
  | AxiosResponse<CreateEmbeddingResponse, any>
  | AxiosResponse<CreateChatCompletionResponse, any>
  | { data: any }
> => {
  const openai = getOpenAi();
  // TODO: 现在就用到这两个
  const keys = ['createEmbedding', 'createChatCompletion'];

  if (!keys.includes(type)) {
    logger.error(`ask type must be one of ${keys.join(',')}`);
    return new Promise((resolve) => {
      resolve({ data: {} });
    });
  }

  switch (type) {
    case 'createEmbedding':
      return openai.createEmbedding({
        model: 'text-embedding-ada-002',
        ...(payload as HCreateEmbeddingRequest),
      });
    case 'createChatCompletion':
      return openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        ...(payload as HCreateChatCompletionRequest),
      });
    default:
      return new Promise((resolve) => {
        resolve({ data: {} });
      });
  }
};

export { setOpenAiConfig, getOpenAiConfig, getOpenAi, askAi };
