/**
 * @ninots/foundation - application foundation.
 *
 * @packageDocumentation
 */

export { Application } from "./src/application";
export type { ApplicationInterface } from "./src/contracts/application-interface";
export type { ContainerInterface } from "./src/contracts/container-interface";
export { createApp, createApplication, type CreateApplicationOptions } from "./src/create-app";
export { createHttpHandler, type CreateHttpHandlerOptions } from "./src/create-http-handler";
export {
    createServeOptions,
    type CreateServeOptionsInput,
    type ServeDevelopment,
    type ServeRouteValue,
} from "./src/create-serve-options";
export {
    CORE_SERVICE_KEYS,
    MIDDLEWARE_STACK_KEY,
    ROUTER_KEY,
    EVENT_DISPATCHER_KEY,
    SYNC_BUS_KEY,
    type CoreServiceKey,
} from "./src/core-keys";
export {
    wireCoreServices,
    type WireCoreServicesDeps,
} from "./src/wire-core-services";
export type {
    CreatePipeline,
    MiddlewareFn,
    MiddlewareStackLike,
    PipelineLike,
    RouteMatch,
    RouterLike,
} from "./src/http-contracts";
export type { ApplicationConfig, ApplicationState, RequestHandler } from "./src/types";
