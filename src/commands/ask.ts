import {
  askAi,
  calculateCosineSimilarity,
  generateContext,
  generateEmbedding,
  getPromptMessage,
} from '@hzb-design/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';
import { IApi } from 'umi';
import { PROCESSED as DEFAULT_PROCESSED } from '../constants';

export default (api: IApi) => {
  api.registerCommand({
    name: 'ask',
    details: `ask hzb`,
    description: '',
    configResolveMode: 'loose',
    async fn({ args: { debug } }) {
      const PROCESSED = api.userConfig?.processed || DEFAULT_PROCESSED;
      let embeddingsStr = '[]';
      try {
        embeddingsStr = readFileSync(
          join(PROCESSED, 'embeddings.json'),
          'utf-8',
        );
      } catch (err) {}
      const embeddings = JSON.parse(embeddingsStr) as any[];
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('请输入你的问题：');
      rl.on('line', async (question) => {
        if (!question) return;
        // Generate question embedding
        try {
          const questionEmbedding = await generateEmbedding(question);
          const matched = calculateCosineSimilarity({
            questionEmbedding,
            embeddings,
          });
          const { REFS, context, maxTokens } = generateContext({ matched });

          const message = getPromptMessage({
            context,
            question,
          });

          if (debug) {
            console.log('messages:', message);
          }
          const completion = await askAi({
            type: 'createChatCompletion',
            payload: {
              messages: [{ role: 'user', content: message }],
              max_tokens: maxTokens,
              temperature: 0.8,
            },
          });
          const answer = completion?.data?.choices?.[0].message?.content;
          console.log('ChatGPT:');
          console.log(answer);
          console.log('');

          console.log('参考链接:');
          REFS.filter((_: any, index: number) => index < 3).forEach(
            (l: string) => {
              console.log(
                l
                  .replace('/doc/umidocs/', 'https://umijs.org/')
                  .replace('/doc/alitadocs/', 'https://alitajs.com/')
                  .replace('.mdx', '')
                  .replace('.md', ''),
              );
            },
          );
          console.log('');
          console.log('请输入你的问题：');
        } catch (error: any) {
          if (error?.response?.data?.error?.message) {
            console.log(
              error?.response?.data?.error?.message || '我也不知道为啥出错',
            );
          } else {
            throw error;
          }
        }
      });
    },
  });
};
