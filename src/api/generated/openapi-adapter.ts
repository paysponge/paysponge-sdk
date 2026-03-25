import { DefaultApi } from "./openapi/index.js";
import type { HTTPQuery, RequestOpts } from "./openapi/runtime.js";
import type { HttpClient } from "../http.js";

const requestBuilder = new DefaultApi();

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function stringifyQuery(
  query: HTTPQuery | undefined,
  prefix = "",
): Record<string, string | undefined> | undefined {
  if (!query) return undefined;

  const entries: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;

    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      entries.push([fullKey, value.map((item) => String(item)).join(",")]);
      continue;
    }

    if (value instanceof Set) {
      entries.push([fullKey, Array.from(value).map((item) => String(item)).join(",")]);
      continue;
    }

    if (value instanceof Date) {
      entries.push([fullKey, value.toISOString()]);
      continue;
    }

    if (typeof value === "object") {
      const nested = stringifyQuery(value as HTTPQuery, fullKey);
      if (nested) {
        entries.push(...Object.entries(nested).filter((entry): entry is [string, string] => entry[1] !== undefined));
      }
      continue;
    }

    entries.push([fullKey, String(value)]);
  }

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function withQuery(path: string, query?: Record<string, string | undefined>): string {
  if (!query || Object.keys(query).length === 0) return path;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }

  const serialized = search.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function getOpenApiRequestBuilder(): DefaultApi {
  return requestBuilder;
}

export async function executeOpenApiRequest<T>(
  http: HttpClient,
  request: Promise<RequestOpts> | RequestOpts,
): Promise<T> {
  const requestOptions = await request;
  const path = normalizePath(requestOptions.path);
  const query = stringifyQuery(requestOptions.query);

  switch (requestOptions.method) {
    case "GET":
      return http.get(path, query) as Promise<T>;
    case "POST":
      return http.post(withQuery(path, query), requestOptions.body) as Promise<T>;
    case "PUT":
      return http.put(withQuery(path, query), requestOptions.body) as Promise<T>;
    case "DELETE":
      return http.delete(withQuery(path, query)) as Promise<T>;
    default:
      throw new Error(`Unsupported OpenAPI request method: ${requestOptions.method}`);
  }
}

export function createGeneratedApiClient(http: HttpClient) {
  const api = getOpenApiRequestBuilder();

  return {
    api,
    request<T>(request: Promise<RequestOpts> | RequestOpts) {
      return executeOpenApiRequest<T>(http, request);
    },
  };
}
