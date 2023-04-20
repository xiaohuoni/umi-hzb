import { IApi } from 'konos';
import { join, extname } from 'path';
import {
  readdir,
  statSync,
  readFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
  readdirSync,
} from 'fs';
import { PROCESSED as DEFAULT_PROCESSED } from '../constants';
import { get_encoding } from '@dqbd/tiktoken';
import { createHash } from 'crypto';

const generateMD5Hash = (content: string) => {
  return createHash('md5').update(content).digest('hex');
};

const parseMd = (mdString: string) => {
  // 去无不需要文案
  return (
    mdString
      // 减少字符
      .replaceAll('——', '—')
      // 全角半角化
      .replaceAll('（', '(')
      .replaceAll('）', ')')
      .replaceAll('：', ':')
      .replaceAll('；', ';')
      .replaceAll('、', '|')
      .replaceAll('，', ',')
      .replaceAll('。', '.')
      .replaceAll('“', `'`)
      .replaceAll('”', `'`)

      // 去除链接
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, '')
      // 去除所有的自闭合标签
      .replace(/<[^>]+\/>/g, '')
      // 去除 mdx 中的 import
      .replace(/import\s+.*?from\s+(['"]).*?\1;/g, '')
      // 去除所有的代码块
      // .replace(/```[\s\S]*?```/g, ' ')
      // 只去除 ts 和 js
      // .replace(/```(ts?|js?|tsx?|jsx?|typescript?|javascript)[\s\S]*?```/g, ' ')
      // 去除 emoji
      .replace(/[\u{1F600}-\u{1F64F}]/gu, ' ')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, ' ')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, ' ')
      .replace(/[\u{2600}-\u{26FF}]/gu, ' ')
      .replace(/[\u{2700}-\u{27BF}]/gu, ' ')
      // 去除空格和换行
      .replaceAll('. ', '.')
      .replaceAll('; ', ';')
      .replaceAll('\n', ' ')
      .replaceAll('\\n', ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/""/g, "'")
  );
};

function getMdFiles(dir: string, fileList: string[] = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getMdFiles(filePath, fileList);
    } else if (extname(file) === '.md' || extname(file) === '.mdx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

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
        const openai = api.appData.openai;

        // # Load the cl100k_base tokenizer which is designed to work with the ada-002 model
        const enc = get_encoding('cl100k_base');
        if (!existsSync(PROCESSED)) {
          mkdirSync(PROCESSED);
        }
        const defaultDocs =
          api.userConfig.docDirs || join(api.paths.cwd, 'doc');
        const scrapeds: any = [];
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
        const files = getMdFiles(defaultDocs);
        for (const filePath of files) {
          const mdText = parseMd(readFileSync(filePath, 'utf-8'));
          if (!mdText) continue;
          const md5Hash = generateMD5Hash(mdText);
          const fileName = filePath.replace(api.paths.cwd, '');
          // 存在就跳过，做增量更新
          if (knowledge[fileName] === md5Hash) {
            continue;
          }
          knowledge[fileName] = md5Hash;
          // 删除旧的 fileName 的数据
          embeddings = embeddings.filter((i) => i.fileName !== fileName);
          console.log('正在解析：', fileName);
          // TODO: 按一级标题和二级标题分割，感觉应该会有更好的办法
          const pattern = /(#|##)\s.*?\.?\s(?=#*\s)/g;
          const texts = mdText.match(pattern) || [mdText];
          for (const t of texts) {
            if (!t) continue;
            const tokens = enc.encode(t).length;
            scrapeds.push({
              fileName,
              text: `${t}`,
              tokens,
            });
          }
        }
        enc.free();

        console.log('开始生成 Embedding...');
        const contents = scrapeds.map((i: any) => i?.text || '');
        // TODO: This model's maximum context length is 8191 tokens, however you requested 14311 tokens (14311 in your prompt; 0 for the completion). Please reduce your prompt; or completion length.
        const { data } = await openai.createEmbedding({
          model: 'text-embedding-ada-002',
          input: contents,
        });
        data.data.forEach((item, index) => {
          scrapeds[index]['embedding'] = item.embedding;
        });
        console.log('开始写入 embeddings.json');

        writeFileSync(
          join(PROCESSED, 'embeddings.json'),
          JSON.stringify([...embeddings, ...scrapeds]),
          'utf-8',
        );
        console.log('开始写入 knowledge.json');

        writeFileSync(
          join(PROCESSED, 'knowledge.json'),
          JSON.stringify(knowledge),
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
