import type { Client } from "./heyapi/client/types.gen.js";
import type { HttpClient } from "../http.js";

type Query = Record<string, unknown> | undefined;
type PathParams = Record<string, unknown> | undefined;

const clientCache = new WeakMap<HttpClient, Client>();

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function resolvePath(pathTemplate: string, pathParams?: PathParams): string {
  const withParams = pathTemplate.replace(/\{([^}]+)\}/g, (_, rawKey: string) => {
    const value = pathParams?.[rawKey];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter: ${rawKey}`);
    }
    return encodeURIComponent(String(value));
  });

  return normalizePath(withParams);
}

function stringifyQuery(
  query: Query
): Record<string, string | undefined> | undefined {
  if (!query) return undefined;

  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      entries.push([key, value.map((item) => String(item)).join(",")]);
      continue;
    }

    entries.push([key, String(value)]);
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

/**
 * Convert SDK HttpClient to the subset of Hey API client interface used by generated sdk methods.
 */
export function getHeyApiClient(http: HttpClient): Client {
  const cached = clientCache.get(http);
  if (cached) return cached;

  const adapter = {
    get: async (options: {
      url: string;
      path?: PathParams;
      query?: Query;
    }) => {
      const path = resolvePath(options.url, options.path);
      return http.get(path, stringifyQuery(options.query));
    },
    post: async (options: {
      url: string;
      path?: PathParams;
      query?: Query;
      body?: unknown;
    }) => {
      const path = resolvePath(options.url, options.path);
      const query = stringifyQuery(options.query);
      return http.post(withQuery(path, query), options.body);
    },
    put: async (options: {
      url: string;
      path?: PathParams;
      query?: Query;
      body?: unknown;
    }) => {
      const path = resolvePath(options.url, options.path);
      const query = stringifyQuery(options.query);
      return http.put(withQuery(path, query), options.body);
    },
    delete: async (options: {
      url: string;
      path?: PathParams;
      query?: Query;
    }) => {
      const path = resolvePath(options.url, options.path);
      const query = stringifyQuery(options.query);
      return http.delete(withQuery(path, query));
    },
  } as unknown as Client;

  clientCache.set(http, adapter);
  return adapter;
}
