import type { ContainerInterface } from "./container-interface";
import type { ApplicationState, ServiceProviderInterface } from "../types";

/**
 * Contract for the Application class.
 */
export interface ApplicationInterface extends ContainerInterface {
    /**
     * The IoC container instance.
     */
    readonly container: ContainerInterface;

    /**
     * Get the current application state.
     */
    getState(): ApplicationState;

    /**
     * Register a service provider.
     */
    register(provider: ServiceProviderInterface): this;

    /**
     * Boot all registered service providers.
     */
    boot(): Promise<void>;

    /**
     * Start the application.
     */
    start(): Promise<void>;

    /**
     * Stop the application.
     */
    stop(): Promise<void>;

    /**
     * Resolve a service from the container.
     */
    make<T>(abstract: string): T;

    /**
     * Register a binding in the container.
     */
    bind<T>(abstract: string, factory: (container: ContainerInterface) => T): void;

    /**
     * Register a singleton binding in the container.
     */
    singleton<T>(abstract: string, factory: (container: ContainerInterface) => T): void;
}
