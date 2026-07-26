/**
 * Factory for creating application instances.
 *
 * @packageDocumentation
 */

import { Application } from "./application";
import type { ContainerInterface } from "./contracts/container-interface";
import type { ApplicationConfig } from "./types";
import { wireCoreServices, type WireCoreServicesDeps } from "./wire-core-services";

/**
 * Options for {@link createApp} / {@link createApplication}.
 */
export interface CreateApplicationOptions {
    /**
     * When true and {@link wireCoreDeps} is provided, register core services.
     * Default false — composition belongs in the app (Sprint 14 independence).
     */
    wireCore?: boolean;
    /**
     * Injected concrete services for {@link wireCoreServices}.
     */
    wireCoreDeps?: WireCoreServicesDeps;
}

/**
 * Creates a new application instance.
 *
 * @param config - Optional application configuration merged with the framework defaults.
 * @param container - Optional IoC container instance.
 * @param options - Bootstrap options
 * @returns A new {@link Application} instance.
 *
 * @example
 * ```typescript
 * const app = createApp({ port: 3000 });
 * await app.start();
 * ```
 */
export function createApp(
    config: ApplicationConfig = {},
    container?: ContainerInterface,
    options: CreateApplicationOptions = {},
): Application {
    const app = new Application(config, container);

    if (options.wireCore === true && options.wireCoreDeps !== undefined) {
        wireCoreServices(app, options.wireCoreDeps);
    }

    return app;
}

/**
 * Alias for {@link createApp} — Laravel-style naming for the public bootstrap API.
 */
export const createApplication = createApp;
