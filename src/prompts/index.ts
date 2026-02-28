import {
  projectionDefinition, projectionHandler,
  harDefinition, harHandler,
  openapiDefinition, openapiHandler,
} from "./build-ifs-skill-guide.js";

export const prompts = [
  { definition: projectionDefinition, handler: projectionHandler },
  { definition: harDefinition,        handler: harHandler },
  { definition: openapiDefinition,    handler: openapiHandler },
];
