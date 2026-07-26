/**
 * Local duck-typed HTTP contracts for foundation (zero `@ninots/*` imports).
 *
 * @packageDocumentation
 */

/**
 * Middleware function shape (structural match with `@ninots/middleware`).
 */
export type MiddlewareFn = (
    request: Request,
    next: (request: Request) => Promise<Response>,
) => Promise<Response>;

/**
 * Route match payload from a router.
 */
export type RouteMatch = {
    route: {
        handler: (request: Request, params: Record<string, string>) => Response | Promise<Response>;
        middleware?: string[];
    };
    params: Record<string, string>;
};

/**
 * Minimal router surface used by {@link createHttpHandler}.
 */
export type RouterLike = {
    match(method: string, pathname: string): RouteMatch | null;
};

/**
 * Minimal middleware stack surface.
 */
export type MiddlewareStackLike = {
    resolve(names: string[]): MiddlewareFn[];
};

/**
 * Minimal pipeline surface (`Pipeline.create().through().then().handle()`).
 */
export type PipelineLike = {
    through(middleware: MiddlewareFn[]): PipelineLike;
    then(handler: (request: Request) => Promise<Response>): PipelineLike;
    handle(request: Request): Promise<Response>;
};

/**
 * Factory that returns a fresh pipeline instance.
 */
export type CreatePipeline = () => PipelineLike;
