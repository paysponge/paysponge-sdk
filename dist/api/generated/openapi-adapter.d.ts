import { DefaultApi } from "./openapi/index.js";
import type { RequestOpts } from "./openapi/runtime.js";
import type { HttpClient } from "../http.js";
export declare function getOpenApiRequestBuilder(): DefaultApi;
export declare function executeOpenApiRequest<T>(http: HttpClient, request: Promise<RequestOpts> | RequestOpts): Promise<T>;
export declare function createGeneratedApiClient(http: HttpClient): {
    api: DefaultApi;
    request<T>(request: Promise<RequestOpts> | RequestOpts): Promise<T>;
};
//# sourceMappingURL=openapi-adapter.d.ts.map