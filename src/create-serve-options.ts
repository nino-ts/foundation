/**
 * Bun.serve options factory for ninoTS applications.
 *
 * @packageDocumentation
 */

import type { BunFile, HTMLBundle, Serve } from "bun";
import type { Application } from "./application";
import type { RequestHandler } from "./types";

/**
 * Bun fullstack development flag / object (`Bun.serve({ development })`).
 *
 * @see https://bun.com/docs/bundler/fullstack
 */
export type ServeDevelopment =
    | boolean
    | {
          chromeDevToolsAutomaticWorkspaceFolders?: boolean;
          console?: boolean;
          hmr?: boolean;
      };

/**
 * Values accepted on `Bun.serve({ routes })` for HTML / static coexistence.
 * Prefer dedicated paths (e.g. `/hmr-demo`) — do not replace named Router routes.
 *
 * @see https://bun.com/docs/runtime/http/server#html-imports
 */
export type ServeRouteValue = HTMLBundle | Response | false | BunFile;

/**
 * Options accepted by {@link createServeOptions}.
 */
export interface CreateServeOptionsInput {
    /**
     * Override the fetch handler. Defaults to the application handler set via
     * {@link wireCoreServices} / {@link Application.setHandler}.
     */
    fetch?: RequestHandler;

    /**
     * Idle timeout in seconds for open connections.
     * @defaultValue 30
     */
    idleTimeout?: number;

    /**
     * Override listen port.
     */
    port?: number | string;

    /**
     * Override bind hostname.
     */
    hostname?: string;

    /**
     * Bun.serve error callback.
     */
    error?: (error: Error) => Response;

    /**
     * Bun fullstack development mode (HMR, SourceMap, richer errors).
     * Defaults to `app.getConfig().development` when omitted.
     */
    development?: ServeDevelopment;

    /**
     * Bun.serve HTML / static routes that coexist with the typed Router `fetch`.
     * Use dedicated paths so named `RouteRegistry` routes stay authoritative.
     */
    routes?: Record<string, ServeRouteValue>;
}

/**
 * Build typed `Bun.serve` options from a booted application.
 *
 * Mirrors the fetch wrapper used by {@link Application.start} so apps can call
 * `Bun.serve(createServeOptions(app))` directly when needed.
 *
 * When `development` is true (from app config or overrides), Bun enables fullstack
 * HMR for HTML imports registered via {@link CreateServeOptionsInput.routes}.
 * This does **not** regenerate `RouteRegistry` — use `startRoutesAutoHook` /
 * `compileArtifact` for typed route artifacts.
 *
 * @param app - Booted application instance
 * @param overrides - Optional serve overrides
 * @returns Bun.serve configuration object
 */
export function createServeOptions(
    app: Application,
    overrides: CreateServeOptionsInput = {},
): Serve.Options<undefined> {
    const config = app.getConfig();
    const baseHandler = overrides.fetch ?? app.getHandler();
    if (baseHandler === undefined || baseHandler === null) {
        throw new Error(
            "createServeOptions requires app.getHandler() or overrides.fetch. Call wireCoreServices(app, deps) first.",
        );
    }

    const fetchHandler = baseHandler;

    const options: Serve.Options<undefined> = {
        fetch: (request: Request) => fetchHandler(request),
        hostname: overrides.hostname ?? config.hostname,
        idleTimeout: overrides.idleTimeout ?? 30,
        port: overrides.port ?? config.port,
        development: overrides.development ?? config.development,
    };

    if (overrides.error) {
        options.error = overrides.error;
    }

    if (overrides.routes !== undefined) {
        options.routes = overrides.routes;
    }

    return options;
}
