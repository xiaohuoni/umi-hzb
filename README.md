# hzb

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
> 3. 在配置文件 .hzbrc.ts 中设置 openAIKey: 'you_openai_kei'

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

新建一个空的 npm 项目，然后新建一个配置文件 `.hzbrc.ts`:
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

## References

-   [openai-cookbook](https://github.com/openai/openai-cookbook/tree/main/apps/web-crawl-q-and-a) - Examples and guides for using the OpenAI API.
-   [pdfGPT](https://github.com/wuomzfx/pdfGPT) - 基于 openai api 的超长 PDF 解析服务.
