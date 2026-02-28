import { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// build_ifs_skill_from_projection
// ---------------------------------------------------------------------------

export const projectionDefinition: Prompt = {
  name: "build_ifs_skill_from_projection",
  description: "Build an IFS skill by fetching the OpenAPI spec live for a named projection.",
  arguments: [
    {
      name: "projection_name",
      description: "IFS projection service name, e.g. 'CustomerHandling', 'TechPortalTaskExecution'.",
      required: true,
    },
    {
      name: "skill_name",
      description: "Filename for the skill (without .md), e.g. 'ifs-parts', 'ifs-sales-customers'.",
      required: true,
    },
  ],
};

export async function projectionHandler(args: Record<string, string>): Promise<GetPromptResult> {
  const { projection_name, skill_name } = args;
  const specEndpoint = `/main/ifsapplications/projection/v1/${projection_name}.svc/$openapi?V2`;
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `I want to build an IFS resource guide for the ${projection_name} projection. ` +
          `The OpenAPI spec is at ${specEndpoint}. ` +
          `Save the skill as ${skill_name}. ` +
          `Please load the ifs-skill-authoring guide via get_api_guide, ` +
          `then fetch the spec and guide me through building the skill.`,
      },
    }],
  };
}

// ---------------------------------------------------------------------------
// build_ifs_skill_from_har
// ---------------------------------------------------------------------------

export const harDefinition: Prompt = {
  name: "build_ifs_skill_from_har",
  description: "Build an IFS skill from a browser HAR recording.",
  arguments: [
    {
      name: "har_file_path",
      description: "Absolute path to a .har file exported from browser DevTools.",
      required: true,
    },
    {
      name: "skill_name",
      description: "Filename for the skill (without .md), e.g. 'ifs-purchase-orders'.",
      required: true,
    },
  ],
};

export async function harHandler(args: Record<string, string>): Promise<GetPromptResult> {
  const { har_file_path, skill_name } = args;
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `I want to build an IFS resource guide from a HAR file. ` +
          `Save the skill as ${skill_name}. ` +
          `Please call parse_har_file with path ${har_file_path} to analyse it, ` +
          `load the ifs-skill-authoring guide via get_api_guide, ` +
          `then guide me through building the skill.`,
      },
    }],
  };
}

// ---------------------------------------------------------------------------
// build_ifs_skill_from_openapi
// ---------------------------------------------------------------------------

export const openapiDefinition: Prompt = {
  name: "build_ifs_skill_from_openapi",
  description: "Build an IFS skill from a downloaded OpenAPI/Swagger spec file.",
  arguments: [
    {
      name: "openapi_file_path",
      description: "Absolute path to a downloaded OpenAPI/Swagger JSON file.",
      required: true,
    },
    {
      name: "skill_name",
      description: "Filename for the skill (without .md), e.g. 'ifs-parts'.",
      required: true,
    },
  ],
};

export async function openapiHandler(args: Record<string, string>): Promise<GetPromptResult> {
  const { openapi_file_path, skill_name } = args;
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `I want to build an IFS resource guide from an OpenAPI spec. ` +
          `Save the skill as ${skill_name}. ` +
          `Please call read_openapi_file with path ${openapi_file_path} to analyse it, ` +
          `load the ifs-skill-authoring guide via get_api_guide, ` +
          `then guide me through building the skill.`,
      },
    }],
  };
}
