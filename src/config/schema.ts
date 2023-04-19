import type { Root } from '@umijs/utils/compiled/@hapi/joi';

export function getSchemas(): Record<string, (Joi: Root) => any> {
  return {
    // TODO: 支持 dumi
    docDirs: (Joi) => Joi.string(),
    processed: (Joi) => Joi.string(),
    openAIKey: (Joi) => Joi.string(),
  };
}
