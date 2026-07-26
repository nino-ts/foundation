/**
 * Test setup for @ninots/foundation.
 *
 * @packageDocumentation
 */

import type { ApplicationConfig } from "../src/types";

/**
 * Creates a test configuration.
 *
 * @param overrides - Configuration overrides
 * @returns A test configuration
 */
export function createTestConfig(overrides: Partial<ApplicationConfig> = {}): ApplicationConfig {
    return {
        development: true,
        hostname: "localhost",
        port: 0, // Use random available port for tests
        ...overrides,
    };
}
