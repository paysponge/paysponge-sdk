import type { Client } from "./heyapi/client/types.gen.js";
import type { HttpClient } from "../http.js";
/**
 * Convert SDK HttpClient to the subset of Hey API client interface used by generated sdk methods.
 */
export declare function getHeyApiClient(http: HttpClient): Client;
//# sourceMappingURL=heyapi-adapter.d.ts.map