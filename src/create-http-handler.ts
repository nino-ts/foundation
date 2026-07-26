/**
 * Factory for the default router + middleware HTTP handler.
 *
 * @packageDocumentation
 */

import type { Application } from "./application";
import { ROUTER_KEY, MIDDLEWARE_STACK_KEY } from "./core-keys";
import type { CreatePipeline, MiddlewareFn, MiddlewareStackLike, RouterLike } from "./http-contracts";
import type { RequestHandler } from "./types";

/**
 * Options for {@link createHttpHandler}.
 */
export type CreateHttpHandlerOptions = {
    /**
     * Pipeline factory (typically `() => Pipeline.create()` from `@ninots/middleware`).
     */
    createPipeline: CreatePipeline;
};

/**
 * Creates an HTTP request handler that dispatches through the registered router and pipeline.
 *
 * @param app - Application with wired router and middleware stack
 * @param options - Injected pipeline factory (local contracts; no `@ninots/*` imports)
 * @returns Request handler suitable for {@link Application.setHandler} or `Bun.serve`
 */
export function createHttpHandler(app: Application, options: CreateHttpHandlerOptions): RequestHandler {
    return async (request: Request): Promise<Response> => {
        const router = app.make<RouterLike>(ROUTER_KEY);
        const middlewareStack = app.make<MiddlewareStackLike>(MIDDLEWARE_STACK_KEY);
        const url = new URL(request.url);
        const match = router.match(request.method, url.pathname);

        if (!match) {
            return new Response("Not Found", { status: 404 });
        }

        const terminal = async (req: Request): Promise<Response> => {
            return match.route.handler(req, match.params);
        };

        const middlewareNames = match.route.middleware ?? [];
        if (middlewareNames.length === 0) {
            return terminal(request);
        }

        const middleware: MiddlewareFn[] = middlewareStack.resolve(middlewareNames);
        const pipeline = options.createPipeline();

        return pipeline.through(middleware).then(terminal).handle(request);
    };
}
