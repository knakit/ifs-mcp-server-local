import fs from "fs";

export interface OpenApiPropertyInfo {
  name: string;
  type: string;         // "string", "integer", "boolean", "number", "object", "array"
  nullable: boolean;
  readOnly?: boolean;
  enumValues?: string[];
  maxLength?: number;
}

export interface OpenApiEntitySet {
  name: string;               // e.g. "CustomerInfoSet"
  entityTypeName: string;     // e.g. "CustomerInfo"
  keyProperty?: string;       // primary key extracted from singleton path pattern
  collectionMethods: string[]; // HTTP methods on /CustomerInfoSet
  singleMethods: string[];     // HTTP methods on /CustomerInfoSet('{Key}')
  properties: OpenApiPropertyInfo[];
  requiredProperties: string[];
}

export interface OpenApiAction {
  name: string;       // e.g. "GetCountryCode"
  method: string;
  pathPattern: string; // raw path (for reference)
}

export interface ParsedOpenApi {
  serviceName: string;  // from info.title
  basePath: string;     // e.g. "/main/ifsapplications/projection/v1/CustomerHandling.svc"
  entitySets: OpenApiEntitySet[];
  actions: OpenApiAction[];
  totalPaths: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractKeyProperty(pathPattern: string): string | undefined {
  // Match '{SomeId}' inside parentheses, e.g. /CustomerInfoSet('{CustomerId}')
  const m = pathPattern.match(/\('{(\w+)}'\)/);
  return m ? m[1] : undefined;
}

function resolveSchema(
  schemaRef: string | undefined,
  spec: any
): Record<string, any> {
  if (!schemaRef) return {};
  const refName = schemaRef.replace(/^#\/definitions\//, "").replace(/^#\/components\/schemas\//, "");
  const defs = spec.definitions ?? spec.components?.schemas ?? {};
  return defs[refName]?.properties ?? {};
}

function resolveRequired(
  schemaRef: string | undefined,
  spec: any
): string[] {
  if (!schemaRef) return [];
  const refName = schemaRef.replace(/^#\/definitions\//, "").replace(/^#\/components\/schemas\//, "");
  const defs = spec.definitions ?? spec.components?.schemas ?? {};
  return defs[refName]?.required ?? [];
}

function extractSchemaRef(operation: any): string | undefined {
  // Swagger 2.0: body parameter with schema.$ref
  if (operation?.parameters) {
    for (const p of operation.parameters) {
      if (p.in === "body" && p.schema?.$ref) return p.schema.$ref;
    }
  }
  // OpenAPI 3.0: requestBody
  const content = operation?.requestBody?.content;
  if (content) {
    for (const ct of Object.values(content) as any[]) {
      if (ct?.schema?.$ref) return ct.schema.$ref;
    }
  }
  // GET response schema — find first 200 response $ref that isn't a collection wrapper
  const resp200 = operation?.responses?.["200"];
  const respRef =
    resp200?.schema?.$ref ??
    resp200?.content?.["application/json"]?.schema?.properties?.value?.items?.$ref;
  return respRef;
}

function buildPropertyInfo(
  propName: string,
  propDef: any
): OpenApiPropertyInfo {
  const type = propDef.type ?? (propDef.$ref ? "object" : "string");
  const info: OpenApiPropertyInfo = {
    name: propName,
    type,
    nullable: propDef["x-nullable"] ?? propDef.nullable ?? false,
  };
  if (propDef.readOnly) info.readOnly = true;
  if (propDef.maxLength) info.maxLength = propDef.maxLength;
  if (Array.isArray(propDef.enum) && propDef.enum.length > 0) {
    info.enumValues = propDef.enum.map(String);
  }
  return info;
}

function entitySetNameFromPath(rawPath: string): string | null {
  // /CustomerInfoSet  → "CustomerInfoSet"
  // /CustomerInfoSet('{CustomerId}') → "CustomerInfoSet"
  // /IfsApp... or /$... → skip
  const segment = rawPath.split("/")[1];
  if (!segment || segment.startsWith("$") || segment.startsWith("IfsApp")) return null;
  return segment.split("(")[0];
}

// ---------------------------------------------------------------------------
// Main exports
// ---------------------------------------------------------------------------

export function parseOpenApi(filePath: string): ParsedOpenApi {
  const raw = fs.readFileSync(filePath, "utf-8");
  const spec = JSON.parse(raw);

  const serviceName: string = spec.info?.title ?? "UnknownService";

  // basePath: Swagger 2.0 has explicit basePath; OpenAPI 3.0 uses servers[]
  let basePath: string = spec.basePath ?? "";
  if (!basePath && Array.isArray(spec.servers) && spec.servers.length > 0) {
    basePath = spec.servers[0].url ?? "";
  }

  const paths: Record<string, any> = spec.paths ?? {};
  const totalPaths = Object.keys(paths).length;

  // --- Group paths by entity set name ---
  const entityMap = new Map<
    string,
    {
      collectionMethods: Set<string>;
      singleMethods: Set<string>;
      keyProperty?: string;
      schemaRef?: string;
    }
  >();

  const actions: OpenApiAction[] = [];

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    const methods = Object.keys(pathItem as object).filter((k) =>
      ["get", "post", "patch", "put", "delete"].includes(k)
    );

    // Detect IfsApp action paths
    if (rawPath.includes("IfsApp.") || rawPath.match(/\w+_\w+\(/)) {
      const actionName =
        rawPath.match(/IfsApp\.[^(]+\.(\w+)/)?.[1] ??
        rawPath.split("/")[1]?.split("(")[0] ??
        rawPath;
      for (const method of methods) {
        actions.push({
          name: actionName,
          method: method.toUpperCase(),
          pathPattern: rawPath,
        });
      }
      continue;
    }

    const entitySetName = entitySetNameFromPath(rawPath);
    if (!entitySetName) continue;

    if (!entityMap.has(entitySetName)) {
      entityMap.set(entitySetName, {
        collectionMethods: new Set(),
        singleMethods: new Set(),
      });
    }

    const entry = entityMap.get(entitySetName)!;
    const isSingleton = rawPath.includes("(");

    for (const method of methods) {
      const operation = (pathItem as any)[method];
      const upperMethod = method.toUpperCase();
      if (isSingleton) {
        entry.singleMethods.add(upperMethod);
        if (!entry.keyProperty) {
          entry.keyProperty = extractKeyProperty(rawPath);
        }
      } else {
        entry.collectionMethods.add(upperMethod);
      }

      // Pick up schema ref from whichever operation has one
      if (!entry.schemaRef) {
        entry.schemaRef = extractSchemaRef(operation);
      }
    }
  }

  // --- Build entity set objects ---
  const entitySets: OpenApiEntitySet[] = [];

  for (const [name, entry] of entityMap.entries()) {
    // Determine entity type name — try stripping trailing "Set"
    const entityTypeName = name.endsWith("Set") ? name.slice(0, -3) : name;

    const rawProps = resolveSchema(entry.schemaRef, spec);
    const required = resolveRequired(entry.schemaRef, spec);

    const properties: OpenApiPropertyInfo[] = Object.entries(rawProps).map(
      ([propName, propDef]) => buildPropertyInfo(propName, propDef)
    );

    entitySets.push({
      name,
      entityTypeName,
      keyProperty: entry.keyProperty,
      collectionMethods: Array.from(entry.collectionMethods),
      singleMethods: Array.from(entry.singleMethods),
      properties,
      requiredProperties: required,
    });
  }

  return { serviceName, basePath, entitySets, actions, totalPaths };
}

export function summariseOpenApi(parsed: ParsedOpenApi): string {
  const lines: string[] = [
    `OpenAPI spec for **${parsed.serviceName}**`,
    `Base path: \`${parsed.basePath}\``,
    `Total paths in spec: ${parsed.totalPaths}`,
    "",
    `Found **${parsed.entitySets.length}** entity set(s) and **${parsed.actions.length}** action(s).`,
    "",
  ];

  for (const es of parsed.entitySets) {
    const allMethods = [
      ...es.collectionMethods.map((m) => `${m} (collection)`),
      ...es.singleMethods.map((m) => `${m} (single)`),
    ];
    lines.push(`### ${es.name}`);
    lines.push(`- Entity type: \`${es.entityTypeName}\``);
    if (es.keyProperty) lines.push(`- Key property: \`${es.keyProperty}\``);
    lines.push(`- Operations: ${allMethods.join(", ")}`);
    lines.push(`- Properties: ${es.properties.length} total, ${es.requiredProperties.length} required`);
    if (es.requiredProperties.length > 0) {
      lines.push(`- Required: ${es.requiredProperties.join(", ")}`);
    }
    const enums = es.properties.filter((p) => p.enumValues && p.enumValues.length > 0);
    if (enums.length > 0) {
      lines.push(`- Enum fields: ${enums.map((p) => p.name).join(", ")}`);
    }
    lines.push("");
  }

  if (parsed.actions.length > 0) {
    lines.push("### Actions / Functions");
    for (const a of parsed.actions) {
      lines.push(`- **${a.method} ${a.name}** — \`${a.pathPattern}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}
