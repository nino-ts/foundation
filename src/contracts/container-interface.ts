/**
 * Interface for the IoC Container.
 * Defined locally in foundation to avoid cross-package dependency.
 */
export interface ContainerInterface {
    bind<T>(abstract: string, factory: (container: ContainerInterface) => T): void;
    singleton<T>(abstract: string, factory: (container: ContainerInterface) => T): void;
    bindIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void;
    singletonIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void;
    make<T>(abstract: string): T;
    bound(abstract: string): boolean;
    instance<T>(abstract: string, instance: T): void;
    forget(abstract: string): void;
    flush(): void;
}
