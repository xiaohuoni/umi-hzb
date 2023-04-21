import { generateHugeEmbeddings, generateScrapeds } from '@hzb-design/core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { IApi } from 'umi';
import { PROCESSED as DEFAULT_PROCESSED } from '../constants';

export default (api: IApi) => {
  api.registerCommand({
    name: 'scraped',
    alias: 's',
    details: `generate scraped csv`,
    description: '',
    configResolveMode: 'loose',
    async fn({}) {
      try {
        const PROCESSED = api.userConfig?.processed || DEFAULT_PROCESSED;

        if (!existsSync(PROCESSED)) {
          mkdirSync(PROCESSED);
        }
        const defaultDocs =
          api.userConfig.docDirs || join(api.paths.cwd, 'doc');
        let embeddingsStr = '[]';
        try {
          embeddingsStr = readFileSync(
            join(PROCESSED, 'embeddings.json'),
            'utf-8',
          );
        } catch (err) {}
        let embeddings = JSON.parse(embeddingsStr) as any[];
        let knowledgeStr = '{}';
        try {
          knowledgeStr = readFileSync(
            join(PROCESSED, 'knowledge.json'),
            'utf-8',
          );
        } catch (err) {}
        const knowledge = JSON.parse(knowledgeStr);
        console.log('开始匹配需要增量更新的文件...');
        const {
          scrapeds,
          scrapedsTokens,
          knowledge: newKnowledge,
          embeddings: newEmbeddings,
        } = await generateScrapeds({
          dir: defaultDocs,
          cwd: api.paths.cwd,
          knowledge,
          embeddings,
        });
        console.log('开始生成 Embedding...');
        const reEmbeddings = await generateHugeEmbeddings(
          scrapeds,
          scrapedsTokens,
        );
        console.log('开始写入 embeddings.json');
        writeFileSync(
          join(PROCESSED, 'embeddings.json'),
          // 增量更新，原有的错误数据先被删除，后面的数据做追加
          JSON.stringify([...newEmbeddings, ...reEmbeddings]),
          'utf-8',
        );
        console.log('开始写入 knowledge.json');
        writeFileSync(
          join(PROCESSED, 'knowledge.json'),
          JSON.stringify(newKnowledge),
          'utf-8',
        );
        console.log('生成 embeddings 完成');
      } catch (error: any) {
        if (error?.response?.data?.error?.message) {
          console.log(
            error?.response?.data?.error?.message || '我也不知道为啥出错',
          );
        } else {
          throw error;
        }
      }
    },
  });
};
