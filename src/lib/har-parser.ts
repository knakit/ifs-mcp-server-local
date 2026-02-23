import fs from "fs";

export interface OperationGroup {
  service: string;           // e.g. "CustomerOrderHandling"
  entityOrFunction: string;  // e.g. "CustomerOrderSet" or "CustomerOrder_SetReleased"
  method: string;            // GET, POST, PATCH, DELETE
  selectFields: string[];
  filterPatterns: string[];  // anonymised — values replaced with {value}
  expand: string[];
  orderby: string[];
  top?: number;
  requestBodyKeys: string[]; // keys seen in POST/PATCH bodies
  responseSample?: Record<string, unknown>;
  callCount: number;
  isAction: boolean;         // true when URL contains an IfsApp action segment
}

export interface ParsedHar {
  totalEntries: number;
  filteredCount: number;
  skippedCount: number;
  groups: OperationGroup[];
}

function anonymiseFilter(filter: string): string {
  // Replace quoted string values but preserve IfsApp enum values
  return filter
    .replace(/eq '(?!IfsApp)[^']*'/g, "eq '{value}'")
    .replace(/ne '(?!IfsApp)[^']*'/g, "ne '{value}'")
    .replace(/contains\(([^,]+),\s*'[^']*'\)/g, "contains($1, '{value}')")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "{date}")
    .replace(/\beq\s+[\d.]+\b/g, "eq {number}")
    .replace(/\bgt\s+[\d.]+\b/g, "gt {number}")
    .replace(/\blt\s+[\d.]+\b/g, "lt {number}");
}

function extractEntityOrFunction(afterSvc: string): { entity: string; isAction: boolean } {
  // afterSvc examples:
  //   CustomerOrderSet
  //   CustomerOrderSet(OrderNo='C10001')/IfsApp.CustomerOrderHandling.CustomerOrder_SetReleased
  //   CustomerOrder_Default()
  const parts = afterSvc.split("/");
  const first = parts[0].split("(")[0];

  const actionPart = parts.find((p) => p.startsWith("IfsApp."));
  if (actionPart) {
    const action = actionPart.split(".").pop() ?? actionPart;
    return { entity: action, isAction: true };
  }
  return { entity: first, isAction: false };
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function flattenResponseSample(body: Record<string, unknown>): Record<string, unknown> {
  // Return only first item from value array, with types not values
  const value = (body as any).value;
  if (Array.isArray(value) && value.length > 0) {
    return typeSkeleton(value[0]);
  }
  return typeSkeleton(body);
}

function typeSkeleton(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return {};
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
      if (v === null) return [k, "null"];
      if (typeof v === "object") return [k, "{object}"];
      return [k, typeof v];
    })
  );
}

export function parseHar(filePath: string): ParsedHar {
  const raw = fs.readFileSync(filePath, "utf-8");
  const har = JSON.parse(raw);
  const entries: any[] = har?.log?.entries ?? [];

  const totalEntries = entries.length;
  let skippedCount = 0;

  const groupMap = new Map<string, OperationGroup>();

  for (const entry of entries) {
    const url: string = entry?.request?.url ?? "";
    const method: string = (entry?.request?.method ?? "GET").toUpperCase();
    const status: number = entry?.response?.status ?? 0;

    // Only keep successful IFS projection API calls
    const projMatch = url.match(/\/projection\/v1\/([^/]+)\.svc\/(.+?)(\?|$)/);
    if (!projMatch || status < 200 || status >= 300) {
      skippedCount++;
      continue;
    }

    const service = projMatch[1];
    const afterSvc = decodeURIComponent(projMatch[2]);
    const { entity, isAction } = extractEntityOrFunction(afterSvc);

    // Skip metadata and batch requests
    if (entity === "$metadata" || entity === "$batch") {
      skippedCount++;
      continue;
    }

    const key = `${service}::${entity}::${method}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        service,
        entityOrFunction: entity,
        method,
        selectFields: [],
        filterPatterns: [],
        expand: [],
        orderby: [],
        requestBodyKeys: [],
        callCount: 0,
        isAction,
      });
    }

    const group = groupMap.get(key)!;
    group.callCount++;

    // Parse query string
    const qIndex = url.indexOf("?");
    if (qIndex !== -1) {
      const params = new URLSearchParams(url.substring(qIndex + 1));

      const select = params.get("$select");
      if (select) {
        for (const f of select.split(",").map((s) => s.trim())) {
          if (f && !group.selectFields.includes(f)) group.selectFields.push(f);
        }
      }

      const filter = params.get("$filter");
      if (filter) {
        const pattern = anonymiseFilter(decodeURIComponent(filter));
        if (!group.filterPatterns.includes(pattern)) group.filterPatterns.push(pattern);
      }

      const expand = params.get("$expand");
      if (expand) {
        for (const e of expand.split(",").map((s) => s.trim())) {
          if (e && !group.expand.includes(e)) group.expand.push(e);
        }
      }

      const orderby = params.get("$orderby");
      if (orderby && !group.orderby.includes(orderby)) group.orderby.push(orderby);

      const top = params.get("$top");
      if (top) group.top = parseInt(top, 10);
    }

    // Parse request body (POST/PATCH)
    if (entry?.request?.postData?.text) {
      const body = safeJsonParse(entry.request.postData.text);
      if (body) {
        for (const k of Object.keys(body)) {
          if (!group.requestBodyKeys.includes(k)) group.requestBodyKeys.push(k);
        }
      }
    }

    // Capture first successful response sample
    if (!group.responseSample && entry?.response?.content?.text) {
      const body = safeJsonParse(entry.response.content.text);
      if (body) group.responseSample = flattenResponseSample(body);
    }
  }

  return {
    totalEntries,
    filteredCount: groupMap.size,
    skippedCount,
    groups: Array.from(groupMap.values()),
  };
}

export function summariseHar(parsed: ParsedHar): string {
  const serviceMap = new Map<string, OperationGroup[]>();
  for (const g of parsed.groups) {
    if (!serviceMap.has(g.service)) serviceMap.set(g.service, []);
    serviceMap.get(g.service)!.push(g);
  }

  const lines: string[] = [
    `HAR file contained ${parsed.totalEntries} total requests.`,
    `Found ${parsed.groups.length} distinct IFS API operation(s) across ${serviceMap.size} projection service(s). Skipped ${parsed.skippedCount} non-IFS or failed requests.`,
    "",
  ];

  for (const [service, groups] of serviceMap.entries()) {
    lines.push(`### ${service}.svc`);
    for (const g of groups) {
      const tag = g.isAction ? " [action]" : "";
      lines.push(`- **${g.method} ${g.entityOrFunction}**${tag} (${g.callCount} call${g.callCount > 1 ? "s" : ""})`);
      if (g.selectFields.length) lines.push(`  - Fields: ${g.selectFields.join(", ")}`);
      if (g.filterPatterns.length) {
        for (const p of g.filterPatterns) lines.push(`  - Filter: \`${p}\``);
      }
      if (g.requestBodyKeys.length) lines.push(`  - Body keys: ${g.requestBodyKeys.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
