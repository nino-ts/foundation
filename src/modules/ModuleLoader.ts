import { join } from "node:path";
import type { ModuleDefinition } from "../types";

export class ModuleLoader {
    constructor(private readonly basePath: string) {}

    /**
     * Load a module manifesto (module.jsonc) dynamically.
     *
     * @param moduleName The directory name of the module.
     */
    public async loadManifest(moduleName: string): Promise<ModuleDefinition> {
        const manifestPath = join(this.basePath, moduleName, "module.jsonc");
        try {
            // Bun natively supports importing .jsonc files
            const manifest = await import(manifestPath);
            return manifest.default as ModuleDefinition;
        } catch (error) {
            throw new Error(`Failed to load manifesto for module [${moduleName}] at ${manifestPath}: ${error}`);
        }
    }
}
