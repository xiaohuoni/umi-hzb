import { get_encoding } from '@dqbd/tiktoken';
import ddot from '@stdlib/blas/base/ddot';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';
import {
  MSX_CONTEXT_TOKENS,
  MSX_RESPONSE_TOKENS,
  MSX_TOKENS,
} from './constants';
import { askAi } from './openai';

const EXTNAMES = ['.md', '.mdx'];

export const getMdFiles = (
  dir: string,
  extnames: string[] = EXTNAMES,
  fileList: string[] = [],
) => {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getMdFiles(filePath, extnames, fileList);
    } else if (extnames.includes(extname(file))) {
      fileList.push(filePath);
    }
  });

  return fileList;
};

const generateMD5Hash = (content: string) => {
  return createHash('md5').update(content).digest('hex');
};

const segmentationString = (mdString: string, extendParse: Function) => {
  if (extendParse && typeof extendParse === 'function') {
    return extendParse(mdString);
  }
  // TODO: 按一级标题和二级标题分割，感觉应该会有更好的办法
  const pattern = /(#|##)\s.*?\.?\s(?=#*\s)/g;
  const texts = mdString.match(pattern) || [mdString];
  return texts;
};

const parseMdString = (
  mdString: string,
  extendParse: Function = (str: string) => str,
) => {
  // 去无不需要文案
  const parseString = mdString
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
    .replaceAll('`', `'`)

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
    .replace(/""/g, "'");
  return extendParse(parseString);
};

interface KnowledgeMap {
  [key: string]: string;
}

interface EmbeddingItem {
  fileName: string;
  text: string;
  tokens: number;
  embedding?: Array<number>;
}

interface ScrapedParameters {
  dir: string;
  cwd: string;
  knowledge: KnowledgeMap;
  embeddings: EmbeddingItem[];
}

export const getPromptMessage = ({
  context,
  question,
  prompt = `Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know".请尽量使用中文回答.`,
}: {
  context: string;
  question: string;
  prompt?: string;
}) => {
  return `
${prompt}
  
Context:
${context}
            
Question:
${question}
            
Answer: 
`;
};

interface GenerateContextParameters {
  matched: EmbeddingItem[];
}

interface GenerateContextResponse {
  contextTokens: number;
  REFS: string[];
  context: string;
  maxTokens: number;
}

export const generateContext = ({
  matched,
}: GenerateContextParameters): GenerateContextResponse => {
  const contexts = [];
  // 记录 context token 长度
  let contextTokens = 0;
  // 记录链接
  const REFS = {} as any;
  for (let key = 0; key < matched.length; key++) {
    const { text = '', tokens = 0, fileName } = matched[key];
    contextTokens += tokens + 4;

    if (contextTokens > MSX_CONTEXT_TOKENS) {
      contexts.push(text.slice(0, contextTokens - MSX_CONTEXT_TOKENS));
      REFS[fileName] = true;
      break;
    }

    contexts.push(text);
    REFS[fileName] = true;
  }
  const mostSimilarContent = contexts.join('\n\n###\n\n');
  const maxTokens = contextTokens + MSX_RESPONSE_TOKENS;
  return {
    contextTokens,
    REFS: Object.keys(REFS),
    context: mostSimilarContent,
    maxTokens: maxTokens > MSX_TOKENS ? MSX_TOKENS : maxTokens,
  };
};

export const calculateCosineSimilarity = ({
  questionEmbedding,
  embeddings,
}: {
  questionEmbedding: Array<number>;
  embeddings: EmbeddingItem[];
}): EmbeddingItem[] => {
  const x = new Float64Array(questionEmbedding);
  const matched = embeddings
    .map(({ embedding, text, tokens, fileName }) => {
      const y = new Float64Array(embedding!);
      const d = ddot(x.length, x, 1, y, 1);
      return {
        ddot: d,
        text,
        tokens: tokens,
        fileName,
      };
    })
    .sort((a, b) => b.ddot - a.ddot)
    .filter((k) => k.ddot > 0.8);

  return matched;
};
export const generateEmbedding = async (question: string) => {
  const { data: questionData } = await askAi({
    type: 'createEmbedding',
    payload: {
      input: [question],
    },
  });
  const questionEmbedding = questionData.data[0].embedding;
  return questionEmbedding;
};

// This model's maximum context length is 8191 tokens, however you requested 14311 tokens (14311 in your prompt; 0 for the completion). Please reduce your prompt; or completion length.
export const generateHugeEmbeddings = async (
  scrapeds: EmbeddingItem[],
  scrapedsTokens: number,
) => {
  if (scrapedsTokens < 8000) {
    return await generateEmbeddings(scrapeds);
  }
  let reScrapeds: EmbeddingItem[] = [];
  let reqScrapeds = [];
  let tokens = scrapedsTokens;
  let key = 0;
  let reqTokens = 0;
  while (tokens > 8000 || key < scrapeds.length - 1) {
    const item = scrapeds[key];
    reqScrapeds.push(item);
    reqTokens += item.tokens;
    key += 1;
    const nextItem = scrapeds[key + 1] || { tokens: 0 };
    if (reqTokens > 8e3 || reqTokens + nextItem.tokens > 8e3) {
      console.log(
        `开始通过 openai 生成 Embeddings，本次请求 tokens 为 ${reqTokens}，剩余 ${tokens}`,
      );
      const reSs = await generateEmbeddings(reqScrapeds);
      reScrapeds = [...reScrapeds, ...reSs];
      tokens = tokens - reqTokens;
      reqTokens = 0;
      reqScrapeds = [];
    }
  }
  if (key < scrapeds.length - 1) {
    reqScrapeds = scrapeds.splice(key);
    const reSs = await generateEmbeddings(reqScrapeds);
    reScrapeds = [...reScrapeds, ...reSs];
  }
  return reScrapeds;
};

export const generateEmbeddings = async (scrapeds: EmbeddingItem[]) => {
  const reScrapeds = scrapeds;
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
  const contents = scrapeds.map((i: any) => i?.text || '');
  const { data } = await askAi({
    type: 'createEmbedding',
    payload: {
      model: 'text-embedding-ada-002',
      input: contents,
    },
  });
  data.data.forEach((item, index) => {
    reScrapeds[index]['embedding'] = item.embedding;
  });
  return reScrapeds;
};

export const generateScrapeds = async ({
  dir,
  cwd,
  knowledge = {},
  embeddings = [],
}: ScrapedParameters) => {
  const scrapeds: EmbeddingItem[] = [];
  let scrapedsTokens = 0;
  // # Load the cl100k_base tokenizer which is designed to work with the ada-002 model
  const enc = get_encoding('cl100k_base');
  const files = getMdFiles(dir);
  for (const filePath of files) {
    const mdText = parseMdString(readFileSync(filePath, 'utf-8'));
    if (!mdText) continue;
    const md5Hash = generateMD5Hash(mdText);
    const fileName = filePath.replace(cwd, '');
    // 存在就跳过，做增量更新
    if (knowledge[fileName] === md5Hash) {
      continue;
    }
    knowledge[fileName] = md5Hash;
    // 删除旧的 fileName 的数据
    embeddings = embeddings.filter((i) => i.fileName !== fileName);
    console.log('正在解析：', fileName);
    const texts = segmentationString(mdText);
    for (const t of texts) {
      if (!t) continue;
      const tokens = enc.encode(t).length;
      scrapedsTokens += tokens;
      scrapeds.push({
        fileName,
        text: `${t}`,
        tokens,
      });
    }
  }
  enc.free();

  return {
    scrapeds,
    scrapedsTokens,
    knowledge,
    embeddings,
  };
};
