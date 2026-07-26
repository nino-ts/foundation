/**
 * Wire core HTTP services into the application container.
 *
 * Concrete router / middleware / events instances are injected by the app
 * (zero `@ninots/*` imports in this package).
 *
 * @packageDocumentation
 */

import type { Application } from "./application";
import { ROUTER_KEY, MIDDLEWARE_STACK_KEY, EVENT_DISPATCHER_KEY, SYNC_BUS_KEY } from "./core-keys";
import { createHttpHandler } from "./create-http-handler";
import type { CreatePipeline } from "./http-contracts";

/**
 * Dependencies supplied by the application composition root.
 */
export type WireCoreServicesDeps = {
    router: unknown;
    middlewareStack: unknown;
    eventDispatcher: unknown;
    syncBus: unknown;
    /**
     * Optional binder for typed `route()` helper (from `@ninots/routing`).
     */
    setRouteResolver?: (router: unknown) => void;
    /**
     * Pipeline factory for the default HTTP handler.
     */
    createPipeline: CreatePipeline;
};

/**
 * Registers router, middleware, events, sync bus, and the default HTTP handler.
 *
 * @param app - Application instance to wire
 * @param deps - Concrete instances + pipeline factory from the app
 * @returns The same application for chaining
 */
export function wireCoreServices(app: Application, deps: WireCoreServicesDeps): Application {
    app.instance(ROUTER_KEY, deps.router);
    app.instance(MIDDLEWARE_STACK_KEY, deps.middlewareStack);
    app.instance(EVENT_DISPATCHER_KEY, deps.eventDispatcher);
    app.instance(SYNC_BUS_KEY, deps.syncBus);
    deps.setRouteResolver?.(deps.router);
    app.setHandler(createHttpHandler(app, { createPipeline: deps.createPipeline }));

    return app;
}
