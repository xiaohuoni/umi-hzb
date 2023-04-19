# hzb

umi 文档答疑机器人

## 安装使用

```bash
npm i hzb -g
```

使用 ask 命令开始问答

```bash
hzb ask --apiKey=openai_key
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

