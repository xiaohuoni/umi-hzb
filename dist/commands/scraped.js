var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/commands/scraped.ts
var scraped_exports = {};
__export(scraped_exports, {
  default: () => scraped_default
});
module.exports = __toCommonJS(scraped_exports);
var import_path = require("path");
var import_fs = require("fs");
var import_constants = require("../constants");
var import_tiktoken = require("@dqbd/tiktoken");
var import_openai = require("openai");
var parseMd = (mdString) => {
  return mdString.replaceAll("\u2014\u2014", "\u2014").replaceAll("\uFF08", "(").replaceAll("\uFF09", ")").replaceAll("\uFF1A", ":").replaceAll("\uFF1B", ";").replaceAll("\u3001", "|").replaceAll("\uFF0C", ",").replaceAll("\u3002", ".").replaceAll("\u201C", `'`).replaceAll("\u201D", `'`).replace(/\[(.*?)\]\((.*?)\)/g, "$1").replace(/https?:\/\/\S+/gi, "").replace(/<[^>]+\/>/g, "").replace(/import\s+.*?from\s+(['"]).*?\1;/g, "").replace(/[\u{1F600}-\u{1F64F}]/gu, " ").replace(/[\u{1F300}-\u{1F5FF}]/gu, " ").replace(/[\u{1F680}-\u{1F6FF}]/gu, " ").replace(/[\u{2600}-\u{26FF}]/gu, " ").replace(/[\u{2700}-\u{27BF}]/gu, " ").replaceAll(". ", ".").replaceAll("; ", ";").replaceAll("\n", " ").replaceAll("\\n", " ").trim().replace(/\s+/g, " ").replace(/""/g, "'");
};
function promiseForEach(array, callback) {
  return new Promise((resolve, reject) => {
    let promises = [];
    array.forEach((item) => {
      promises.push(callback(item));
    });
    Promise.all(promises).then(() => {
      resolve(null);
    }).catch((error) => {
      reject(error);
    });
  });
}
var scraped_default = (api) => {
  api.registerCommand({
    name: "scraped",
    alias: "s",
    details: `generate scraped csv`,
    description: "",
    configResolveMode: "loose",
    async fn({ args: { apiKey } }) {
      var _a, _b;
      const PROCESSED = ((_a = api.userConfig) == null ? void 0 : _a.processed) || import_constants.PROCESSED;
      const enc = (0, import_tiktoken.get_encoding)("cl100k_base");
      if (!(0, import_fs.existsSync)(PROCESSED)) {
        (0, import_fs.mkdirSync)(PROCESSED);
      }
      const defaultDocs = api.userConfig.docDirs || (0, import_path.join)(api.paths.cwd, "doc");
      const scrapeds = [];
      const processDirectory = (directory) => {
        return new Promise((resolve) => {
          (0, import_fs.readdir)(directory, (err, files) => {
            if (err) {
              console.error(err);
              return;
            }
            promiseForEach(files, async (file) => {
              const filePath = (0, import_path.join)(directory, file);
              if ((0, import_fs.statSync)(filePath).isDirectory()) {
                await processDirectory(filePath);
              } else {
                if ((0, import_path.extname)(filePath) === ".md" || (0, import_path.extname)(filePath) === ".mdx") {
                  const mdText = parseMd((0, import_fs.readFileSync)(filePath, "utf-8"));
                  if (!mdText || mdText.length < 10)
                    return;
                  const fileName = filePath.replace(api.paths.cwd, "");
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
      await processDirectory(defaultDocs);
      enc.free();
      const basePath = `https://proxy.igpthub.com/v1`;
      const config = new import_openai.Configuration({
        apiKey: ((_b = api.userConfig) == null ? void 0 : _b.openAIKey) || apiKey,
        basePath
      });
      const openai = new import_openai.OpenAIApi(config);
      const contents = scrapeds.map((i) => (i == null ? void 0 : i.text) || "");
      const { data } = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: contents
      });
      data.data.forEach((item, index) => {
        scrapeds[index]["embedding"] = item.embedding;
      });
      (0, import_fs.writeFileSync)(
        (0, import_path.join)(PROCESSED, "embeddings.json"),
        JSON.stringify(scrapeds),
        "utf-8"
      );
    }
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
