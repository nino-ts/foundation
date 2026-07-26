/**
 * Boot integration tests — router dispatch through Application lifecycle.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { createApp } from "../../src/create-app";
import { EVENT_DISPATCHER_KEY, ROUTER_KEY, SYNC_BUS_KEY } from "../../src/core-keys";
import { createHttpHandler } from "../../src/create-http-handler";
import { createServeOptions } from "../../src/create-serve-options";
import { wireCoreServices } from "../../src/wire-core-services";
import { FakeContainer } from "../helpers/fake-container";
import {
    FakeRouter,
    FakeSyncBus,
    createPipeline,
    createWireDeps,
} from "../helpers/http-fakes";

describe("foundation boot integration", () => {
    test("createHttpHandler dispatches a registered route", async () => {
        const container = new FakeContainer();
        const router = new FakeRouter();
        const app = createApp({ port: 0 }, container, {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });

        router.get("/health", () => Response.json({ status: "ok" }));

        const handler = createHttpHandler(app, { createPipeline });
        const response = await handler(new Request("http://localhost/health"));
        const body = (await response.json()) as { status: string };

        expect(response.status).toBe(200);
        expect(body.status).toBe("ok");
    });

    test("Application.start serves a matched route", async () => {
        const container = new FakeContainer();
        const router = new FakeRouter();
        const app = createApp({ port: 0, hostname: "127.0.0.1" }, container, {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });

        router.get("/ping", () => new Response("pong"));

        await app.start();

        const server = app.getServer();
        expect(server).toBeDefined();

        const port = server?.port ?? 0;
        const response = await fetch(`http://127.0.0.1:${port}/ping`);

        expect(response.status).toBe(200);
        expect(await response.text()).toBe("pong");

        await app.shutdown();
    });

    test("wireCoreServices registers events and sync bus", async () => {
        const container = new FakeContainer();
        const app = createApp({ port: 0 }, container);
        wireCoreServices(app, createWireDeps());

        const dispatcher = app.make(EVENT_DISPATCHER_KEY);
        const bus = app.make<FakeSyncBus>(SYNC_BUS_KEY);

        expect(dispatcher).toBeDefined();
        expect(bus.getConnection()).toBe("sync");
    });

    test("wireCoreServices binds setRouteResolver callback", async () => {
        const container = new FakeContainer();
        const app = createApp({ port: 0 }, container);
        const router = new FakeRouter();
        let resolved: FakeRouter | undefined;

        wireCoreServices(app, {
            ...createWireDeps(router),
            setRouteResolver: (candidate) => {
                resolved = candidate as FakeRouter;
            },
        });

        expect(resolved).toBe(router);
        expect(app.make(ROUTER_KEY)).toBe(router);
    });

    test("createServeOptions exposes fetch for Bun.serve", async () => {
        const container = new FakeContainer();
        const router = new FakeRouter();
        const app = createApp({ port: 0, hostname: "127.0.0.1" }, container, {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });

        router.get("/ready", () => Response.json({ ready: true }));

        const options = createServeOptions(app);
        const server = Bun.serve(options);

        try {
            const response = await fetch(`http://127.0.0.1:${server.port}/ready`);
            const body = (await response.json()) as { ready: boolean };

            expect(response.status).toBe(200);
            expect(body.ready).toBe(true);
        } finally {
            server.stop();
        }
    });
});
