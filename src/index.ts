interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Singapore Government Procurement MCP — GeBIZ tender awards (keyless).
 *
 * Wraps the public, no-auth CKAN datastore on data.gov.sg for the official
 * "Government Procurement via GeBIZ (Tenders Awarded)" dataset. Each record is
 * a tender awarded to a supplier: tender number, awarding agency, description,
 * awarded amount (SGD), award date, and status.
 *
 * Data source: data.gov.sg CKAN datastore, resource
 * d_acde1106003906a75c3fa052592f2fcb (~18k+ awards).
 *
 * All tools return shaped, LLM-friendly objects (not raw API passthrough) and
 * never throw — fetch/parse failures resolve to { error }. Amounts are in SGD.
 */


const BASE = 'https://data.gov.sg/api/action';
const RESOURCE_ID = 'd_acde1106003906a75c3fa052592f2fcb';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'singapore_search_awards',
    description:
      'Search Singapore government procurement tender awards from the official GeBIZ dataset on data.gov.sg (keyless). Full-text search over awarding agency, supplier name, and tender description. Returns each award with tender number, agency, supplier, description, awarded amount (SGD), award date, and status. Use for questions like "which company won contract X", "how much did agency Y award for Z", or listing recent government contract awards. Omit "query" to page through all awards. Amounts are in Singapore Dollars (SGD).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Optional full-text keyword — matched across agency, supplier name, and tender description (e.g. "cloud", "Accenture", "Ministry of Health"). Omit to list all awards.',
        },
        limit: {
          type: ['number', 'string'],
          description: 'Max awards to return (1–100). Default 20.',
        },
        offset: {
          type: ['number', 'string'],
          description: 'Number of matching awards to skip, for paging. Default 0.',
        },
      },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'singapore_search_awards':
        return await searchAwards(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchAwards(args: Record<string, unknown>): Promise<unknown> {
  const query = strArg(args.query);
  const limit = clampInt(args.limit, 20, 1, 100);
  const offset = clampInt(args.offset, 0, 0, 1_000_000);

  const params = new URLSearchParams({
    resource_id: RESOURCE_ID,
    limit: String(limit),
    offset: String(offset),
  });
  if (query) params.set('q', query);

  const data = (await ckanGet(`/datastore_search?${params.toString()}`)) as {
    result?: { records?: any[]; total?: number };
  };
  const result = data.result ?? {};
  const records = result.records ?? [];

  const awards = records.map((r) => ({
    tender_no: r.tender_no ?? null,
    agency: r.agency ?? null,
    supplier: r.supplier_name ?? null,
    description: r.tender_description ?? null,
    amount_sgd: parseAmount(r.awarded_amt),
    award_date: r.award_date ?? null,
    status: r.tender_detail_status ?? null,
  }));

  return {
    source: 'GeBIZ — Government Procurement (Tenders Awarded), data.gov.sg',
    currency: 'SGD',
    query: query ?? null,
    total_matches: result.total ?? awards.length,
    limit,
    offset,
    count: awards.length,
    awards,
  };
}

async function ckanGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    const body = await res.text().then((t) => t.slice(0, 200)).catch(() => '');
    throw new Error(`data.gov.sg CKAN: ${res.status} ${body}`.trim());
  }
  return res.json();
}

function parseAmount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strArg(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function clampInt(v: unknown, dflt: number, min: number, max: number): number {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && v.trim()) n = Number(v);
  else return dflt;
  if (!Number.isFinite(n)) return dflt;
  n = Math.floor(n);
  return Math.min(max, Math.max(min, n));
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
