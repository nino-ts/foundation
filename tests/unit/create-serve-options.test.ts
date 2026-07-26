/**
 * createServeOptions — development HMR + HTML routes coexistence.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { createApp } from "../../src/create-app";
import { createServeOptions } from "../../src/create-serve-options";
import hmrDemo from "../fixtures/hmr-demo/hmr-demo.html";
import { FakeContainer } from "../helpers/fake-container";
import { FakeRouter, createWireDeps } from "../helpers/http-fakes";

describe("createServeOptions() development + routes", () => {
    test("defaults development from app config", () => {
        const router = new FakeRouter();
        const app = createApp({ port: 0, development: true }, new FakeContainer(), {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });
        const options = createServeOptions(app);

        expect(options.development).toBe(true);
    });

    test("override can disable development even when app is in development", () => {
        const router = new FakeRouter();
        const app = createApp({ port: 0, development: true }, new FakeContainer(), {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });
        const options = createServeOptions(app, { development: false });

        expect(options.development).toBe(false);
    });

    test("HTML routes coexist with Router fetch (dedicated path)", async () => {
        const container = new FakeContainer();
        const router = new FakeRouter();
        const app = createApp({ port: 0, hostname: "127.0.0.1", development: true }, container, {
            wireCore: true,
            wireCoreDeps: createWireDeps(router),
        });
        router.get("/api/ping", () => Response.json({ ok: true }));

        const options = createServeOptions(app, {
            routes: {
                "/hmr-demo": hmrDemo,
            },
        });

        expect(options.development).toBe(true);
        expect(options.routes).toBeDefined();

        const server = Bun.serve(options);
        try {
            const api = await fetch(`http://127.0.0.1:${server.port}/api/ping`);
            expect(api.status).toBe(200);
            expect(await api.json()).toEqual({ ok: true });

            const page = await fetch(`http://127.0.0.1:${server.port}/hmr-demo`);
            expect(page.status).toBe(200);
            const body = await page.text();
            expect(body).toContain("hmr-label");
            expect(body.toLowerCase()).toContain("<!doctype html>");
        } finally {
            server.stop(true);
        }
    });
});
