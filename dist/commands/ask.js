var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/commands/ask.ts
var ask_exports = {};
__export(ask_exports, {
  default: () => ask_default
});
module.exports = __toCommonJS(ask_exports);
var import_constants = require("../constants");
var import_readline = __toESM(require("readline"));
var import_fs = require("fs");
var import_path = require("path");
var import_openai = require("openai");
var import_ddot = __toESM(require("@stdlib/blas/base/ddot"));
var ask_default = (api) => {
  api.registerCommand({
    name: "ask",
    details: `ask hzb`,
    description: "",
    configResolveMode: "loose",
    async fn({ args: { debug, apiKey } }) {
      var _a, _b;
      const PROCESSED = ((_a = api.userConfig) == null ? void 0 : _a.processed) || import_constants.PROCESSED;
      const basePath = `https://proxy.igpthub.com/v1`;
      const config = new import_openai.Configuration({
        apiKey: ((_b = api.userConfig) == null ? void 0 : _b.openAIKey) || apiKey,
        basePath
      });
      const openai = new import_openai.OpenAIApi(config);
      const embeddingsStr = (0, import_fs.readFileSync)(
        (0, import_path.join)(PROCESSED, "embeddings.json"),
        "utf-8"
      );
      const embeddings = JSON.parse(embeddingsStr);
      const rl = import_readline.default.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      console.log("\u8BF7\u8F93\u5165\u4F60\u7684\u95EE\u9898\uFF1A");
      rl.on("line", async (question) => {
        var _a2, _b2, _c, _d, _e, _f;
        try {
          const { data: questionData } = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: [question]
          });
          const questionEmbedding = questionData.data[0].embedding;
          const x = new Float64Array(questionEmbedding);
          const matched = embeddings.map(({ embedding, text, tokens, fileName, n_tokens }) => {
            const y = new Float64Array(embedding);
            const d = (0, import_ddot.default)(x.length, x, 1, y, 1);
            return {
              ddot: d,
              text,
              tokens: tokens || n_tokens,
              fileName
            };
          }).sort((a, b) => b.ddot - a.ddot).filter((k) => k.ddot > 0.8);
          const contexts = [];
          let curLen = 0;
          const REFS = {};
          for (let key = 0; key < matched.length; key++) {
            const { text = "", tokens = 0, fileName } = matched[key];
            curLen += tokens + 4;
            if (curLen > import_constants.MSX_CONTEXT_TOKENS) {
              contexts.push(text.slice(0, curLen - import_constants.MSX_CONTEXT_TOKENS));
              REFS[fileName] = true;
              break;
            }
            contexts.push(text);
            REFS[fileName] = true;
          }
          const mostSimilarContent = contexts.join("\n\n###\n\n");
          if (debug) {
            console.log(`Context:
          ${mostSimilarContent}`);
          }
          const prompt = `
Answer the question based on the context below, and if the question can't be answered based on the context, say "I don't know".\u8BF7\u5C3D\u91CF\u4F7F\u7528\u4E2D\u6587\u56DE\u7B54.

Context:
${mostSimilarContent}
          
Question:
${question}
          
Answer: 
  `;
          const maxTokens = curLen + import_constants.MSX_RESPONSE_TOKENS;
          const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            // 留 500 token 用于回答
            max_tokens: maxTokens > import_constants.MSX_TOKENS ? import_constants.MSX_TOKENS : maxTokens,
            temperature: 0.5,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          });
          const answer = (_c = (_b2 = (_a2 = completion == null ? void 0 : completion.data) == null ? void 0 : _a2.choices) == null ? void 0 : _b2[0].message) == null ? void 0 : _c.content;
          console.log("ChatGPT:");
          console.log(answer);
          console.log("");
          console.log("\u53C2\u8003\u94FE\u63A5:");
          Object.keys(REFS).filter((_, index) => index < 3).forEach((l) => {
            console.log(
              l.replace("/doc/umidocs/", "https://umijs.org/").replace("/doc/alitadocs/", "https://alitajs.com/").replace(".mdx", "").replace(".md", "")
            );
          });
          console.log("");
          console.log("\u8BF7\u8F93\u5165\u4F60\u7684\u95EE\u9898\uFF1A");
        } catch (error) {
          console.log(
            ((_f = (_e = (_d = error == null ? void 0 : error.response) == null ? void 0 : _d.data) == null ? void 0 : _e.error) == null ? void 0 : _f.message) || "\u6211\u4E5F\u4E0D\u77E5\u9053\u4E3A\u5565\u51FA\u9519"
          );
        }
      });
    }
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
