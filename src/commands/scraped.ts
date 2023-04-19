import { IApi } from 'konos';
import { join, extname } from 'path';
import {
  readdir,
  statSync,
  readFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
} from 'fs';
import { PROCESSED as DEFAULT_PROCESSED } from '../constants';
import { get_encoding } from '@dqbd/tiktoken';
// 写成 csv 文件
// import { createObjectCsvWriter } from 'csv-writer';
import { Configuration, OpenAIApi } from 'openai';

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

function promiseForEach(array: string[], callback: Function) {
  return new Promise((resolve, reject) => {
    let promises: Function[] = [];
    array.forEach((item: string) => {
      promises.push(callback(item));
    });
    Promise.all(promises)
      .then(() => {
        resolve(null);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export default (api: IApi) => {
  api.registerCommand({
    name: 'scraped',
    alias: 's',
    details: `generate scraped csv`,
    description: '',
    configResolveMode: 'loose',
    async fn({ args: { apiKey } }) {
      const PROCESSED = api.userConfig?.processed || DEFAULT_PROCESSED;
      // # Load the cl100k_base tokenizer which is designed to work with the ada-002 model
      const enc = get_encoding('cl100k_base');
      if (!existsSync(PROCESSED)) {
        mkdirSync(PROCESSED);
      }
      const defaultDocs = api.userConfig.docDirs || join(api.paths.cwd, 'doc');
      const scrapeds: any = [];

      // 递归函数，用于遍历目录并处理文件
      const processDirectory = (directory: string) => {
        return new Promise((resolve) => {
          readdir(directory, (err, files) => {
            if (err) {
              console.error(err);
              return;
            }
            promiseForEach(files, async (file: string) => {
              const filePath = join(directory, file);
              // 如果是子目录，则递归处理
              if (statSync(filePath).isDirectory()) {
                await processDirectory(filePath);
              } else {
                // 如果是 md 文件，则读取内容并写入 CSV
                if (
                  extname(filePath) === '.md' ||
                  extname(filePath) === '.mdx'
                ) {
                  const mdText = parseMd(readFileSync(filePath, 'utf-8'));
                  if (!mdText || mdText.length < 10) return;
                  const fileName = filePath.replace(api.paths.cwd, '');
                  const pattern = /(#|##)\s.*?\.?\s(?=#*\s)/g;
                  const texts = mdText.match(pattern) || [mdText];
                  texts.forEach((t) => {
                    const tokens = enc.encode(t).length;
                    scrapeds.push({ fileName, text: `${t}`, tokens });
                  });
                }
              }
            }).then(() => {
              resolve(scrapeds);
            });
          });
        });
      };

      // 开始处理目录
      await processDirectory(defaultDocs);
      enc.free();
      // console.log('scrapeds', scrapeds.length);
      const basePath = `https://proxy.igpthub.com/v1`;

      const config = new Configuration({
        apiKey: api.userConfig?.openAIKey || apiKey,
        basePath,
      });
      const openai = new OpenAIApi(config);
      const contents = scrapeds.map((i: any) => i?.text || '');
      const { data } = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: contents,
      });
      data.data.forEach((item, index) => {
        scrapeds[index]['embedding'] = item.embedding;
      });
      // 写成 csv 文件
      //   const csvWriter = createObjectCsvWriter({
      //     path: join(PROCESSED, 'embeddings.csv'),
      //     header: [
      //       { id: 'fileName', title: 'fileName' },
      //       { id: 'text', title: 'text' },
      //       { id: 'embedding', title: 'embedding' },
      //     ],
      //   });

      //   csvWriter
      //     .writeRecords(scrapeds) // returns a promise
      //     .then(() => {
      //       console.log('...Done');
      //     });
      writeFileSync(
        join(PROCESSED, 'embeddings.json'),
        JSON.stringify(scrapeds),
        'utf-8',
      );
    },
  });
};
