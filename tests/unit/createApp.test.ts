/**
 * Unit tests for createApp factory.
 *
 * TDD: These tests define the expected behavior BEFORE implementation.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { Application } from "../../src/application";
import type { ContainerInterface } from "../../src/contracts/container-interface";
import { createApp } from "../../src/create-app";

const createStubContainer = (): ContainerInterface => ({
    bind(): void {},
    bindIf(): void {},
    bound(): boolean {
        return false;
    },
    flush(): void {},
    forget(): void {},
    instance(): void {},
    make<T>(): T {
        throw new Error("Stub container does not resolve bindings");
    },
    singleton(): void {},
    singletonIf(): void {},
});

describe("createApp", () => {
    test("should create an Application instance", () => {
        const app = createApp({ port: 3000 });

        expect(app).toBeInstanceOf(Application);
    });

    test("should apply configuration", () => {
        const app = createApp({ hostname: "0.0.0.0", port: 8080 });

        expect(app.getConfig().port).toBe(8080);
        expect(app.getConfig().hostname).toBe("0.0.0.0");
    });

    test("should use default configuration when not provided", () => {
        const app = createApp();

        expect(app.getConfig().port).toBe(3000);
        expect(app.getConfig().hostname).toBe("localhost");
    });

    test("should accept a container instance", () => {
        const container = createStubContainer();
        const app = createApp({ port: 3000 }, container);

        expect(app.container).toBe(container);
    });
});
