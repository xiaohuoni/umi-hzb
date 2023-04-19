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

// src/constants.ts
var constants_exports = {};
__export(constants_exports, {
  CACHE_PATH: () => CACHE_PATH,
  MSX_CONTEXT_TOKENS: () => MSX_CONTEXT_TOKENS,
  MSX_RESPONSE_TOKENS: () => MSX_RESPONSE_TOKENS,
  MSX_TOKENS: () => MSX_TOKENS,
  PROCESSED: () => PROCESSED
});
module.exports = __toCommonJS(constants_exports);
var import_path = require("path");
var CACHE_PATH = ".hzb";
var PROCESSED = (0, import_path.join)(__dirname, "../processed");
var MSX_TOKENS = 4095;
var MSX_CONTEXT_TOKENS = 666;
var MSX_RESPONSE_TOKENS = 500;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CACHE_PATH,
  MSX_CONTEXT_TOKENS,
  MSX_RESPONSE_TOKENS,
  MSX_TOKENS,
  PROCESSED
});
