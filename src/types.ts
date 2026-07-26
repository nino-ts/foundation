/**
 * Type definitions for the Foundation package.
 *
 * @packageDocumentation
 */

import type { ContainerInterface } from "./contracts/container-interface";

/**
 * Application configuration options.
 */
export interface ApplicationConfig {
    /**
     * Port to listen on.
     * @defaultValue 3000
     */
    port?: number;

    /**
     * Hostname to bind to.
     * @defaultValue 'localhost'
     */
    hostname?: string;

    /**
     * Whether to enable development mode.
     * @defaultValue false
     */
    development?: boolean;
}

/**
 * Possible states of the application.
 */
export type ApplicationState = "created" | "registered" | "booted" | "running" | "stopped";

/**
 * Interface for service providers.
 */
export interface ServiceProviderInterface {
    /**
     * Register services in the container.
     *
     * @param container - The container instance
     */
    register(container: ContainerInterface): void;

    /**
     * Boot services after all providers are registered.
     */
    boot(): void | Promise<void>;
}

/**
 * Handler function for HTTP requests.
 */
export type RequestHandler = (request: Request) => Response | Promise<Response>;

/**
 * Interface for custom error handlers.
 *
 * Allows centralized error handling across the application.
 *
 * @example
 * ```typescript
 * class JsonErrorHandler implements ErrorHandler {
 *     handle(error: Error, request?: Request): Response {
 *         return new Response(JSON.stringify({ error: error.message }), {
 *             status: 500,
 *             headers: { 'Content-Type': 'application/json' }
 *         });
 *     }
 * }
 * ```
 */
export interface ErrorHandler {
    /**
     * Handle an error and return a response.
     *
     * @param error - The error that occurred
     * @param request - Optional request that caused the error
     * @returns Response to send to the client
     */
    handle(error: Error, request?: Request): Response | Promise<Response>;
}

/**
 * Configuration options for error handling.
 */
export interface ErrorHandlerOptions {
    /**
     * Enable debug mode (shows stack traces).
     * @defaultValue false
     */
    debug?: boolean;

    /**
     * Custom logger function for errors.
     */
    logger?: (error: Error) => void;
}

/**
 * Configuration options for graceful shutdown.
 */
export interface ShutdownOptions {
    /**
     * Maximum time to wait for active requests (milliseconds).
     * @defaultValue 10000 (10 seconds)
     */
    timeout?: number;

    /**
     * Force immediate shutdown without waiting for requests.
     * @defaultValue false
     */
    force?: boolean;
}

/**
 * Server metrics for observability and monitoring.
 */
export interface ServerMetrics {
    /**
     * Total number of requests processed.
     */
    readonly requestCount: number;

    /**
     * Total number of requests that resulted in errors.
     */
    readonly errorCount: number;

    /**
     * Average response time in milliseconds.
     */
    readonly averageResponseTime: number;

    /**
     * Server uptime in milliseconds since boot.
     */
    readonly uptime: number;
}

/**
 * Collector for server metrics.
 */
export interface MetricsCollector {
    /**
     * Record a completed request.
     *
     * @param duration - Request duration in milliseconds
     * @param error - Optional error if request failed
     */
    recordRequest(duration: number, error?: Error): void;

    /**
     * Get current metrics.
     *
     * @returns Current server metrics
     */
    getMetrics(): ServerMetrics;
}

/**
 * Definition of a module's manifesto (module.jsonc).
 */
export interface ModuleDefinition {
    /**
     * The name of the module.
     */
    name: string;

    /**
     * The version of the module.
     */
    version: string;

    /**
     * Service providers exported by the module.
     */
    providers?: string[];

    /**
     * Does the module have HTTP routes?
     * @defaultValue false
     */
    routes?: boolean;

    /**
     * List of module dependencies (other ninots modules).
     */
    dependencies?: string[];
}
