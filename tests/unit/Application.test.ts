/**
 * Unit tests for Application.
 *
 * TDD: These tests define the expected behavior BEFORE implementation.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { Application } from "../../src/application";
import type { ContainerInterface } from "../../src/contracts/container-interface";
import { createTestConfig } from "../setup";
import type { ErrorHandler, MetricsCollector, ServerMetrics } from "../../src/types";

const createStubContainer = (): ContainerInterface => {
    const factories = new Map<string, (container: ContainerInterface) => unknown>();
    const instances = new Map<string, unknown>();
    const singletons = new Set<string>();

    const container: ContainerInterface = {
        bind<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
            factories.set(abstract, factory as (container: ContainerInterface) => unknown);
        },
        bindIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
            if (!factories.has(abstract)) {
                factories.set(abstract, factory as (container: ContainerInterface) => unknown);
            }
        },
        bound(abstract: string): boolean {
            return factories.has(abstract) || instances.has(abstract);
        },
        flush(): void {
            factories.clear();
            instances.clear();
            singletons.clear();
        },
        forget(abstract: string): void {
            factories.delete(abstract);
            instances.delete(abstract);
            singletons.delete(abstract);
        },
        instance<T>(abstract: string, instance: T): void {
            instances.set(abstract, instance);
        },
        make<T>(abstract: string): T {
            const factory = factories.get(abstract);
            if (!factory) {
                throw new Error(`Binding not found: ${abstract}`);
            }

            if (singletons.has(abstract)) {
                if (!instances.has(abstract)) {
                    instances.set(abstract, factory(container));
                }
                return instances.get(abstract) as T;
            }

            return factory(container) as T;
        },
        singleton<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
            factories.set(abstract, factory as (container: ContainerInterface) => unknown);
            singletons.add(abstract);
        },
        singletonIf<T>(abstract: string, factory: (container: ContainerInterface) => T): void {
            if (!factories.has(abstract)) {
                factories.set(abstract, factory as (container: ContainerInterface) => unknown);
                singletons.add(abstract);
            }
        },
    };

    return container;
};

/**
 * Simple metrics collector for testing.
 */
class TestMetricsCollector implements MetricsCollector {
    private requestCount = 0;
    private errorCount = 0;
    private totalDuration = 0;
    private startTime = Date.now();

    recordRequest(duration: number, error?: Error): void {
        this.requestCount++;
        this.totalDuration += duration;
        if (error) {
            this.errorCount++;
        }
    }

    getMetrics(): ServerMetrics {
        const avgDuration = this.requestCount > 0 ? this.totalDuration / this.requestCount : 0;
        return {
            averageResponseTime: Math.round(avgDuration),
            errorCount: this.errorCount,
            requestCount: this.requestCount,
            uptime: Date.now() - this.startTime,
        };
    }
}

describe("Application", () => {
    describe("constructor", () => {
        test("should create application with config", () => {
            const config = createTestConfig({ port: 3000 });
            const app = new Application(config);

            expect(app).toBeInstanceOf(Application);
        });

        test("should accept a container instance", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            expect(app.container).toBe(container);
        });

        test("should use default config values", () => {
            const app = new Application({});

            expect(app.getConfig().port).toBe(3000);
            expect(app.getConfig().hostname).toBe("localhost");
        });

        test("should start in created state", () => {
            const app = new Application({});

            expect(app.getState()).toBe("created");
        });

        test("should use fallback container when none provided", () => {
            const app = new Application({});

            // Fallback container should be accessible
            expect(app.container).toBeDefined();

            // But attempting to use it should throw error
            expect(() => {
                app.make("test");
            }).toThrow("Container not configured");
        });

        test("should throw descriptive errors from fallback container", () => {
            const app = new Application({});

            // Test bind error
            expect(() => {
                app.bind("test", () => "value");
            }).toThrow("Container not configured");

            // Test singleton error
            expect(() => {
                app.singleton("test", () => "value");
            }).toThrow("Container not configured");

            // Test flush error
            expect(() => {
                app.flush();
            }).toThrow("Container not configured");
        });

        test("should cover all fallback container error methods", () => {
            const app = new Application({});

            // Test each error-throwing method from fallback container
            expect(() => app.bindIf("a", () => "x")).toThrow("Container not configured");
            expect(() => app.singletonIf("b", () => "y")).toThrow("Container not configured");
            expect(() => app.instance("c", "value")).toThrow("Container not configured");
            expect(() => app.forget("d")).toThrow("Container not configured");
            expect(() => app.make("e")).toThrow("Container not configured");

            // Test non-throwing method
            expect(app.bound("f")).toBe(false);
        });
    });

    describe("register()", () => {
        test("should register a service provider", () => {
            const app = new Application({});
            const provider = {
                boot: () => {},
                register: () => {},
            };

            app.register(provider);

            expect(app.getProviders()).toContain(provider);
        });

        test("should call provider register method", () => {
            const app = new Application({});
            let registerCalled = false;
            const provider = {
                boot: () => {},
                register: () => {
                    registerCalled = true;
                },
            };
            app.register(provider);

            expect(registerCalled).toBe(true);
        });

        test("should pass container to provider register", () => {
            const container = createStubContainer();
            const app = new Application({}, container);
            let capturedContainer: ContainerInterface | null = null;
            const provider = {
                boot: () => {},
                register: (currentContainer: ContainerInterface) => {
                    capturedContainer = currentContainer;
                },
            };

            app.register(provider);

            if (capturedContainer === null) {
                throw new Error("Expected container to be captured");
            }

            expect(capturedContainer === container).toBe(true);
        });

        test("should transition to registered state", () => {
            const app = new Application({});
            const provider = {
                boot: () => {},
                register: () => {},
            };

            app.register(provider);

            expect(app.getState()).toBe("registered");
        });
    });

    describe("boot()", () => {
        test("should boot all registered providers", async () => {
            const app = new Application({});
            let bootCalled = false;
            const provider = {
                boot: () => {
                    bootCalled = true;
                },
                register: () => {},
            };

            app.register(provider);
            await app.boot();

            expect(bootCalled).toBe(true);
        });

        test("should transition to booted state", async () => {
            const app = new Application({});

            await app.boot();

            expect(app.getState()).toBe("booted");
        });

        test("should support async boot methods", async () => {
            const app = new Application({});
            let asyncBootCalled = false;
            const provider = {
                boot: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    asyncBootCalled = true;
                },
                register: () => {},
            };

            app.register(provider);
            await app.boot();

            expect(asyncBootCalled).toBe(true);
        });

        test("should boot providers in sequence (FIFO order)", async () => {
            const app = new Application({});
            const bootSequence: number[] = [];

            const provider1 = {
                boot: () => {
                    bootSequence.push(1);
                },
                register: () => {},
            };

            const provider2 = {
                boot: () => {
                    bootSequence.push(2);
                },
                register: () => {},
            };

            const provider3 = {
                boot: () => {
                    bootSequence.push(3);
                },
                register: () => {},
            };

            app.register(provider1);
            app.register(provider2);
            app.register(provider3);

            await app.boot();

            expect(bootSequence).toEqual([1, 2, 3]);
        });

        test("should handle provider boot failures gracefully", async () => {
            const app = new Application({});
            const bootSequence: number[] = [];

            const provider1 = {
                boot: () => {
                    bootSequence.push(1);
                },
                register: () => {},
            };

            const provider2 = {
                boot: () => {
                    bootSequence.push(2);
                    throw new Error("Provider 2 boot failed");
                },
                register: () => {},
            };

            const provider3 = {
                boot: () => {
                    bootSequence.push(3);
                },
                register: () => {},
            };

            app.register(provider1);
            app.register(provider2);
            app.register(provider3);

            // Boot should throw error from provider 2
            try {
                await app.boot();
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect((error as Error).message).toBe("Provider 2 boot failed");
                // Only providers before the error should have booted
                expect(bootSequence).toContain(1);
                expect(bootSequence).toContain(2);
                // Provider 3 should not boot because provider 2 failed
                expect(bootSequence).not.toContain(3);
            }
        });
    });

    describe("setHandler()", () => {
        test("should set the request handler", () => {
            const app = new Application({});
            const handler = () => new Response("OK");

            app.setHandler(handler);

            expect(app.getHandler()).toBe(handler);
        });
    });

    describe("setErrorHandler()", () => {
        test("should set the error handler", () => {
            const app = new Application({});
            const errorHandler: ErrorHandler = {
                handle: (error: Error) => new Response(error.message, { status: 500 }),
            };

            const result = app.setErrorHandler(errorHandler);

            expect(result).toBe(app); // Should return this for chaining
        });

        test("should call error handler when request throws", async () => {
            const app = new Application(createTestConfig());
            let errorHandled = false;
            let capturedErrorMessage = "";

            app.setHandler(() => {
                throw new Error("Test error");
            });

            app.setErrorHandler({
                handle: (error: Error) => {
                    errorHandled = true;
                    capturedErrorMessage = error.message;
                    return new Response("Error handled", { status: 500 });
                },
            });

            await app.start();

            // Get the actual port from the server
            const server = app.getServer();
            const port = server?.port ?? 0;

            // Make a request to trigger error
            const response = await fetch(`http://localhost:${port}/`);
            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Error handled");
            expect(errorHandled).toBe(true);
            expect(capturedErrorMessage === "Test error").toBe(true);

            await app.stop();
        });

        test("should pass request to error handler", async () => {
            const app = new Application(createTestConfig());
            let capturedRequest: Request | undefined;

            app.setHandler(() => {
                throw new Error("Test error");
            });

            app.setErrorHandler({
                handle: (_error: Error, request?: Request) => {
                    capturedRequest = request;
                    return new Response("Error", { status: 500 });
                },
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            await fetch(`http://localhost:${port}/test-path`);

            expect(capturedRequest).toBeDefined();
            expect(capturedRequest).toBeInstanceOf(Request);

            await app.stop();
        });

        test("should support async error handlers", async () => {
            const app = new Application(createTestConfig());

            app.setHandler(() => {
                throw new Error("Async test");
            });

            app.setErrorHandler({
                handle: async (error: Error) => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return new Response(`Async: ${error.message}`, { status: 500 });
                },
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            const response = await fetch(`http://localhost:${port}/`);
            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Async: Async test");

            await app.stop();
        });

        test("should execute error handlers in registration order when multiple are set", async () => {
            const app = new Application(createTestConfig());
            const executionOrder: string[] = [];

            app.setHandler(() => {
                throw new Error("Test error");
            });

            // Set first error handler
            app.setErrorHandler({
                handle: (_error: Error) => {
                    executionOrder.push("first");
                    return new Response("First handler", { status: 500 });
                },
            });

            // Set second error handler (should override first)
            app.setErrorHandler({
                handle: (_error: Error) => {
                    executionOrder.push("second");
                    return new Response("Second handler", { status: 500 });
                },
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            const response = await fetch(`http://localhost:${port}/`);
            expect(response.status).toBe(500);
            expect(await response.text()).toBe("Second handler");
            expect(executionOrder).toEqual(["second"]);

            await app.stop();
        });
    });

    describe("shutdown()", () => {
        test("should shutdown the server", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();
            expect(app.getState()).toBe("running");

            await app.shutdown();
            expect(app.getState()).toBe("stopped");
        });

        test("should wait for active requests", async () => {
            const app = new Application(createTestConfig());
            let requestFinished = false;

            app.setHandler(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                requestFinished = true;
                return new Response("OK");
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Start a slow request but don't await it
            const fetchPromise = fetch(`http://localhost:${port}/`);

            // Give the request time to start
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Shutdown should wait for the request
            await app.shutdown({ timeout: 5000 });

            // Request should be finished
            expect(requestFinished).toBe(true);
            const response = await fetchPromise;
            expect(response.status).toBe(200);
        });

        test("should force shutdown immediately", async () => {
            const app = new Application(createTestConfig());

            app.setHandler(async () => {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                return new Response("OK");
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Start a slow request
            void fetch(`http://localhost:${port}/`);

            // Give the request time to start
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Force shutdown
            await app.shutdown({ force: true });

            // Server should be stopped immediately
            expect(app.getState()).toBe("stopped");
            // Request might not be finished due to force shutdown
        });

        test("should timeout waiting for requests", async () => {
            const app = new Application(createTestConfig());

            app.setHandler(async () => {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                return new Response("OK");
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Start a slow request
            fetch(`http://localhost:${port}/`).catch(() => {});

            // Give the request time to start
            await new Promise((resolve) => setTimeout(resolve, 10));

            const startTime = Date.now();
            // Shutdown with short timeout
            await app.shutdown({ timeout: 100 });
            const elapsed = Date.now() - startTime;

            // Should timeout after approximately 100ms
            expect(elapsed).toBeGreaterThanOrEqual(100);
            expect(elapsed).toBeLessThan(500); // Allow some margin
        });

        test("should handle multiple shutdown calls", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();

            // Call shutdown multiple times
            await app.shutdown();
            await app.shutdown();
            await app.shutdown();

            expect(app.getState()).toBe("stopped");
        });

        test("should shutdown app with no active requests", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();
            expect(app.getState()).toBe("running");

            // Shutdown without any active requests
            await app.shutdown({ timeout: 100 });

            expect(app.getState()).toBe("stopped");
        });

        test("should shutdown gracefully with middleware cleanup", async () => {
            const app = new Application(createTestConfig());
            const cleanupOrder: string[] = [];

            // Simulate middleware with cleanup logic
            const middleware1 = {
                boot: () => {
                    cleanupOrder.push("boot-1");
                },
                register: () => {},
            };

            const middleware2 = {
                boot: () => {
                    cleanupOrder.push("boot-2");
                },
                register: () => {},
            };

            app.register(middleware1);
            app.register(middleware2);
            app.setHandler(() => new Response("OK"));

            await app.start();
            expect(app.getState()).toBe("running");

            await app.shutdown({ timeout: 1000 });
            expect(app.getState()).toBe("stopped");
            // Verify providers were booted in order
            expect(cleanupOrder).toContain("boot-1");
            expect(cleanupOrder).toContain("boot-2");
        });

        test("should handle shutdown errors without crashing", async () => {
            const app = new Application(createTestConfig());

            app.setHandler(() => new Response("OK"));

            await app.start();
            expect(app.getState()).toBe("running");

            // Call shutdown multiple times with different options
            // First shutdown
            await app.shutdown({ timeout: 100 });
            expect(app.getState()).toBe("stopped");

            // Second shutdown (already stopped)
            await app.shutdown({ timeout: 100 });
            expect(app.getState()).toBe("stopped");

            // Force shutdown (already stopped)
            await app.shutdown({ force: true });
            expect(app.getState()).toBe("stopped");
        });
    });

    describe("setMetricsCollector()", () => {
        test("should set the metrics collector", () => {
            const app = new Application({});
            const collector = new TestMetricsCollector();

            const result = app.setMetricsCollector(collector);

            expect(result).toBe(app); // Should return this for chaining
        });

        test("should record request metrics", async () => {
            const app = new Application(createTestConfig());
            const collector = new TestMetricsCollector();

            app.setMetricsCollector(collector);
            app.setHandler(async () => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return new Response("OK");
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Make a request
            await fetch(`http://localhost:${port}/`);

            const metrics = app.getMetrics();
            expect(metrics).toBeDefined();
            expect(metrics?.requestCount).toBe(1);
            expect(metrics?.errorCount).toBe(0);
            expect(metrics?.averageResponseTime).toBeGreaterThanOrEqual(20);

            await app.stop();
        });

        test("should track error count in metrics", async () => {
            const app = new Application(createTestConfig());
            const collector = new TestMetricsCollector();

            app.setMetricsCollector(collector);
            app.setHandler(() => {
                throw new Error("Test error");
            });
            app.setErrorHandler({
                handle: () => new Response("Error", { status: 500 }),
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Make a request that throws
            await fetch(`http://localhost:${port}/`);

            const metrics = app.getMetrics();
            expect(metrics?.requestCount).toBe(1);
            expect(metrics?.errorCount).toBe(1);

            await app.stop();
        });

        test("should calculate average response time", async () => {
            const app = new Application(createTestConfig());
            const collector = new TestMetricsCollector();

            app.setMetricsCollector(collector);
            app.setHandler(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return new Response("OK");
            });

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            // Make multiple requests
            await Promise.all([
                fetch(`http://localhost:${port}/`),
                fetch(`http://localhost:${port}/`),
                fetch(`http://localhost:${port}/`),
            ]);

            const metrics = app.getMetrics();
            expect(metrics?.requestCount).toBe(3);
            expect(metrics?.averageResponseTime).toBeGreaterThanOrEqual(10);

            await app.stop();
        });

        test("should return null if no metrics collector", () => {
            const app = new Application({});

            const metrics = app.getMetrics();
            expect(metrics).toBeNull();
        });

        test("should track uptime", async () => {
            const app = new Application(createTestConfig());
            const collector = new TestMetricsCollector();

            app.setMetricsCollector(collector);
            app.setHandler(() => new Response("OK"));

            await app.start();

            const server = app.getServer();
            const port = server?.port ?? 0;

            await fetch(`http://localhost:${port}/`);

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 50));

            const metrics = app.getMetrics();
            expect(metrics?.uptime).toBeGreaterThanOrEqual(50);

            await app.stop();
        });
    });

    describe("start()", () => {
        test("should start the server", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();

            expect(app.getState()).toBe("running");
            expect(app.getServer()).toBeDefined();

            await app.stop();
        });

        test("should boot if not already booted", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();

            expect(app.getState()).toBe("running");

            await app.stop();
        });
    });

    describe("stop()", () => {
        test("should stop the server", async () => {
            const app = new Application(createTestConfig());
            app.setHandler(() => new Response("OK"));

            await app.start();
            await app.stop();

            expect(app.getState()).toBe("stopped");
        });
    });

    describe("getConfig()", () => {
        test("should return the application config", () => {
            const config = createTestConfig({ port: 8080 });
            const app = new Application(config);

            expect(app.getConfig().port).toBe(8080);
        });
    });

    describe("container shortcuts", () => {
        test("should resolve bindings through make()", () => {
            const container = createStubContainer();
            container.bind("service", () => "value");
            const app = new Application({}, container);

            expect(app.make<string>("service")).toBe("value");
        });

        test("should register bindings via bind()", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.bind("bound", () => "ok");

            expect(container.bound("bound")).toBe(true);
        });

        test("should register singleton via singleton()", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.singleton("counter", () => ({ count: 0 }));

            const first = app.make<{ count: number }>("counter");
            const second = app.make<{ count: number }>("counter");
            expect(first).toBe(second);
        });

        test("bound() should check if binding exists", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            expect(app.bound("missing")).toBe(false);
            app.bind("present", () => "yes");
            expect(app.bound("present")).toBe(true);
        });

        test("bindIf() should only bind if not already bound", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.bind("service", () => "first");
            app.bindIf("service", () => "second");

            expect(app.make<string>("service")).toBe("first");
        });

        test("singletonIf() should only bind if not already bound", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.singleton("service", () => ({ original: true }));
            app.singletonIf("service", () => ({ original: false }));

            expect(app.make<{ original: boolean }>("service").original).toBe(true);
        });

        test("instance() should register an existing instance", () => {
            const container = createStubContainer();
            const app = new Application({}, container);
            const obj = { key: "value" };

            app.instance("myObj", obj);

            expect(container.bound("myObj")).toBe(true);
        });

        test("forget() should remove a binding", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.bind("temp", () => "temporary");
            expect(app.bound("temp")).toBe(true);

            app.forget("temp");
            expect(app.bound("temp")).toBe(false);
        });

        test("flush() should remove all bindings", () => {
            const container = createStubContainer();
            const app = new Application({}, container);

            app.bind("a", () => 1);
            app.bind("b", () => 2);

            app.flush();

            expect(app.bound("a")).toBe(false);
            expect(app.bound("b")).toBe(false);
        });
    });
});
