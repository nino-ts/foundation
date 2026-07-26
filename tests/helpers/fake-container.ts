/**
 * Local fake container for foundation tests (zero `@ninots/*` imports).
 *
 * @packageDocumentation
 */

import type { ContainerInterface } from "../../src/contracts/container-interface";

export class FakeContainer implements ContainerInterface {
    private readonly instances = new Map<string, unknown>();
    private readonly factories = new Map<string, (container: ContainerInterface) => unknown>();
    private readonly singletons = new Map<string, unknown>();

    bind<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
        this.factories.set(abstract, factory);
    }

    singleton<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
        this.factories.set(abstract, factory);
        this.singletons.set(abstract, undefined);
    }

    bindIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
        if (!this.bound(abstract)) {
            this.bind(abstract, factory);
        }
    }

    singletonIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
        if (!this.bound(abstract)) {
            this.singleton(abstract, factory);
        }
    }

    make<T>(abstract: string): T {
        if (this.instances.has(abstract)) {
            return this.instances.get(abstract) as T;
        }
        if (this.singletons.has(abstract)) {
            const cached = this.singletons.get(abstract);
            if (cached !== undefined) {
                return cached as T;
            }
            const factory = this.factories.get(abstract);
            if (!factory) {
                throw new Error(`Binding not found: ${abstract}`);
            }
            const value = factory(this);
            this.singletons.set(abstract, value);
            return value as T;
        }
        const factory = this.factories.get(abstract);
        if (!factory) {
            throw new Error(`Binding not found: ${abstract}`);
        }
        return factory(this) as T;
    }

    bound(abstract: string): boolean {
        return this.instances.has(abstract) || this.factories.has(abstract);
    }

    instance<T>(abstract: string, instance: T): void {
        this.instances.set(abstract, instance);
    }

    forget(abstract: string): void {
        this.instances.delete(abstract);
        this.factories.delete(abstract);
        this.singletons.delete(abstract);
    }

    flush(): void {
        this.instances.clear();
        this.factories.clear();
        this.singletons.clear();
    }
}
