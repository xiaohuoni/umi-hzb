# hzb

[![Based On Umi](https://img.shields.io/badge/based%20on-umi-blue)](http://umijs.org/)

umi 文档答疑机器人 

临时在线服务： https://umi-ruddy.vercel.app/ 

![image](https://user-images.githubusercontent.com/11746742/233385352-112400ee-46dd-4565-ae4f-4a3c2f63f3be.png)

## 安装使用

```bash
npm i hzb -g
```

使用 ask 命令开始问答

```bash
hzb ask --apiKey=openai_key
```

> 支持三种方式设置 apiKey:
> 
> 1. 设置环境变量 process.env.OPENAI_API_KEY=you_openai_kei
> 2. 执行命令携带参数，<command> --apiKey=you_openai_kei
> 3. 在配置文件 .umirc.ts 中设置 openAIKey: 'you_openai_kei'

<img width="1496" alt="image" src="https://user-images.githubusercontent.com/11746742/233239784-355a4a4e-cdd5-43d7-aff3-80e7b871e554.png">


## 集成到 umi 系项目

```bash
pnpm i hzb
```

使用 `hzb/dist/preset-hzb` 或者从 `preset-hzb/dist` 中选择性使用 plugins

```ts
export default {
    presets: [require.resolve('hzb/dist/preset-hzb'),]
    openAIKey: 'you_openai_kei'
};
```

使用 `umi ask` 等命令

```bash
> umi ask

info  - [你知道吗？] 如果想检测未使用的文件和导出，可尝试新出的 deadCode 配置项，详见 https://umijs.org/docs/api/config#deadcode
请输入你的问题：
> hi
ChatGPT:
你好
```

## 如何训练一个自己的文档答疑机器人？

新建一个空的 npm 项目，然后新建一个配置文件 `.umirc.ts`:
写上配置 `openAIKey` `docDirs` `processed`，不明白可以使用 `hzb init demo` 初始化一个项目

```bash
mkdir some
cd some
hzb init demo
pnpm i  // 随手写的脚本，暂时只支持 pnpm
```

然后将你要提供训练的 md 文档，放到 `docs` 目录，可以通过配置 `docDirs` 修改。

### 执行训练

```bash
pnpm scraped 
```

等待执行结束，有报错注意报错，最终生成 `processed/embeddings.json`

- 支持增量构建
- 支持等待生成 Embeddings

### 测试结果

```bash
pnpm ask

请输入你的问题：
what is node?
ChatGPT:
Node is chicken.

参考链接:
/docs/README
```

## 集成到 node 服务

安装 `@hzb-design/core`

```
pnpm i @hzb-design/core
```

### 配置 OpenAiConfig

apiKey 必须设置，其他配置可选。可以通过以下2种方式设置:
  
1. 设置环境变量 process.env.OPENAI_API_KEY=you_openai_kei
2. 通过 @hzb-design/core.setOpenAiConfig({ apiKey: 'you_openai_kei' }) 设置 

```ts
import { setOpenAiConfig } from '@hzb-design/core';
setOpenAiConfig({
  apiKey: 'you_openai_kei',
  proxy?: string;
  disableProxy?: boolean;
  ...openai.ConfigurationParameters
})
```

默认会使用代理，可以通过配置 `disableProxy: true` 关闭

### 获取 openai 单例

```ts
import { getOpenAi } from '@hzb-design/core';
const openai = getOpenAi();
const data = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    temperature: 0.5,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    messages: [{ role: 'user', content: 'abc' }],
})
```

### ask to openai api

```ts
import { askAi } from '@hzb-design/core';
const completion = await askAi({
    type: 'createChatCompletion',
    payload: {
        messages: [{ role: 'user', content: message }],
        max_tokens: maxTokens,
        temperature: 0.8,
    },
});
```

> 为什么要有 askAi ？
> 可以在接口限制发生变动的时候，通过 askAi 内部统一处理，比如如果用户发的消息巨大的时候，可以在 askAi 里，将消息拆开，再把响应数据合并起来回给用户。

type 现在仅支持这两个 'createEmbedding', 'createChatCompletion'

### 数据加工

就是一些解析 md 用到的工具类，也是通过 '@hzb-design/core' 导出使用，具体的可以看 `suites/core/src/processed.ts` 里的实现，后续固定下来之后会有文档说明。

```ts
import { xxx } from '@hzb-design/core';
```

## References

-   [openai-cookbook](https://github.com/openai/openai-cookbook/tree/main/apps/web-crawl-q-and-a) - Examples and guides for using the OpenAI API.
-   [pdfGPT](https://github.com/wuomzfx/pdfGPT) - 基于 openai api 的超长 PDF 解析服务.
