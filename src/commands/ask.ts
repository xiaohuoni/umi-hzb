import { IApi } from 'umi';
import {
  MSX_CONTEXT_TOKENS,
  MSX_RESPONSE_TOKENS,
  MSX_TOKENS,
  PROCESSED as DEFAULT_PROCESSED,
} from '../constants';
import readline from 'readline';
import { readFileSync } from 'fs';
import { join } from 'path';
import ddot from '@stdlib/blas/base/ddot';

export default (api: IApi) => {
  api.registerCommand({
    name: 'ask',
    details: `ask hzb`,
    description: '',
    configResolveMode: 'loose',
    async fn({ args: { debug } }) {
      const PROCESSED = api.userConfig?.processed || DEFAULT_PROCESSED;
      const openai = api.appData.openai;
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
        // Generate question embedding
        try {
          const { data: questionData } = await openai.createEmbedding({
            model: 'text-embedding-ada-002',
            input: [question],
          });
          const questionEmbedding = questionData.data[0].embedding;

          // 2.2、Calculate cosine similarity
          const x = new Float64Array(questionEmbedding);
          const matched = embeddings
            .map(({ embedding, text, tokens, fileName, n_tokens }) => {
              const y = new Float64Array(embedding);
              const d = ddot(x.length, x, 1, y, 1);
              return {
                ddot: d,
                text,
                tokens: tokens || n_tokens,
                fileName,
              };
            })
            .sort((a, b) => b.ddot - a.ddot)
            .filter((k) => k.ddot > 0.8);
          const contexts = [];
          // 记录 context token 长度
          let curLen = 0;
          // 记录链接
          const REFS = {} as any;
          for (let key = 0; key < matched.length; key++) {
            const { text = '', tokens = 0, fileName } = matched[key];
            curLen += tokens + 4;

            if (curLen > MSX_CONTEXT_TOKENS) {
              contexts.push(text.slice(0, curLen - MSX_CONTEXT_TOKENS));
              REFS[fileName] = true;
              break;
            }

            contexts.push(text);
            REFS[fileName] = true;
          }
          const mostSimilarContent = contexts.join('\n\n###\n\n');
          if (debug) {
            console.log(`Context:
          ${mostSimilarContent}`);
          }
          const prompt = `
Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know".请尽量使用中文回答.

Context:
${mostSimilarContent}
          
Question:
${question}
          
Answer: 
  `;
          const maxTokens = curLen + MSX_RESPONSE_TOKENS;
          const completion = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            // 留 500 token 用于回答
            max_tokens: maxTokens > MSX_TOKENS ? MSX_TOKENS : maxTokens,
            temperature: 0.5,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          });
          const answer = completion?.data?.choices?.[0].message?.content;
          console.log('ChatGPT:');
          console.log(answer);
          console.log('');

          console.log('参考链接:');
          Object.keys(REFS)
            .filter((_, index) => index < 3)
            .forEach((l) => {
              console.log(
                l
                  .replace('/doc/umidocs/', 'https://umijs.org/')
                  .replace('/doc/alitadocs/', 'https://alitajs.com/')
                  .replace('.mdx', '')
                  .replace('.md', ''),
              );
            });
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
