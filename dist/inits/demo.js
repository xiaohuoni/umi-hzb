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

// src/inits/demo.ts
var demo_exports = {};
__export(demo_exports, {
  default: () => demo_default
});
module.exports = __toCommonJS(demo_exports);
var import_path = require("path");
var import_konos = require("konos");
var demo_default = (api) => {
  api.describe({
    key: "inits:demo"
  });
  api.registerInit({
    key: "demo",
    name: "demo",
    description: "\u521D\u59CB\u5316\u6846\u67B6\u5305",
    template: (0, import_path.join)(__dirname, "..", "..", "templates", "demo"),
    type: import_konos.InitType.init,
    questions: []
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
