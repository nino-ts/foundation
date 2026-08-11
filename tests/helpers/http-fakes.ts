/**
 * Local HTTP fakes for foundation tests (zero `@ninots/*` imports).
 *
 * @packageDocumentation
 */

import type {
    CreatePipeline,
    MiddlewareFn,
    MiddlewareStackLike,
    PipelineLike,
    RouterLike,
} from "../../src/http-contracts";

type RouteEntry = {
    method: string;
    path: string;
    name?: string;
    handler: (request: Request, params: Record<string, string>) => Response | Promise<Response>;
    middleware?: string[];
};

export class FakeRouter implements RouterLike {
    private readonly routes: RouteEntry[] = [];
    private resolver: ((router: FakeRouter) => void) | undefined;

    get(path: string, handler: RouteEntry["handler"]): { name: (n: string) => void } {
        const entry: RouteEntry = { method: "GET", path, handler };
        this.routes.push(entry);
        return {
            name: (n: string) => {
                entry.name = n;
                this.resolver?.(this);
            },
        };
    }

    match(method: string, pathname: string) {
        const route = this.routes.find((entry) => entry.method === method && entry.path === pathname);
        if (!route) {
            return null;
        }
        return { route, params: {} as Record<string, string> };
    }

    resolveName(name: string): string | undefined {
        return this.routes.find((entry) => entry.name === name)?.path;
    }
}

export class FakeMiddlewareStack implements MiddlewareStackLike {
    private readonly map = new Map<string, MiddlewareFn>();

    add(name: string, middleware: MiddlewareFn): void {
        this.map.set(name, middleware);
    }

    resolve(names: string[]): MiddlewareFn[] {
        return names.map((name) => {
            const middleware = this.map.get(name);
            if (!middleware) {
                throw new Error(`Unknown middleware: ${name}`);
            }
            return middleware;
        });
    }
}

function createFakePipeline(): PipelineLike {
    let middleware: MiddlewareFn[] = [];
    let finalHandler: ((request: Request) => Response | Promise<Response>) | null = null;

    const pipeline: PipelineLike = {
        through(nextMiddleware: MiddlewareFn[]): PipelineLike {
            middleware = [...nextMiddleware];
            return pipeline;
        },
        then(handler: (request: Request) => Response | Promise<Response>): PipelineLike {
            finalHandler = handler;
            return pipeline;
        },
        async handle(request: Request): Promise<Response> {
            if (!finalHandler) {
                throw new Error("Pipeline requires a final handler.");
            }
            const run = async (index: number, req: Request): Promise<Response> => {
                const current = middleware[index];
                if (!current) {
                    return finalHandler(req);
                }
                return current(req, (nextReq) => run(index + 1, nextReq));
            };
            return run(0, request);
        },
    };

    return pipeline;
}

export const createPipeline: CreatePipeline = () => createFakePipeline();

export class FakeEventDispatcher {}

export class FakeSyncBus {
    constructor(private readonly connection: string) {}

    getConnection(): string {
        return this.connection;
    }
}

export function createWireDeps(router = new FakeRouter(), stack = new FakeMiddlewareStack()) {
    return {
        router,
        middlewareStack: stack,
        eventDispatcher: new FakeEventDispatcher(),
        syncBus: new FakeSyncBus("sync"),
        createPipeline,
        setRouteResolver: (_router: unknown) => {
            // no-op for unit tests unless route() helper is asserted separately
        },
    };
}
