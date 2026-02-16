import fs from "fs/promises";
import path from "path";
import type { ProviderConfig } from "../../shared/types.js";
import { registry } from "../providers/provider-registry.js";

const DATA_DIR = process.env.DATA_DIR || "./data";
const CONFIG_FILE = path.join(DATA_DIR, "provider-configs.json");

/**
 * Persistent configuration store for provider configs.
 * Stores as a JSON file in the data directory.
 */
class ConfigStore {
  private configs: ProviderConfig[] = [];
  private loaded = false;

  async load(): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(CONFIG_FILE, "utf-8");
      this.configs = JSON.parse(raw);
      this.loaded = true;
      console.log(`[config] Loaded ${this.configs.length} provider configs`);
    } catch {
      // File doesn't exist yet — initialize defaults from registry
      this.configs = this.buildDefaults();
      this.loaded = true;
      await this.save();
      console.log(
        `[config] Initialized ${this.configs.length} default provider configs`
      );
    }
  }

  private buildDefaults(): ProviderConfig[] {
    const defaults: ProviderConfig[] = [];

    for (const def of registry.getAllDefinitions()) {
      if (def.id === "custom") continue; // Skip the custom template

      defaults.push({
        id: def.id,
        name: def.name,
        enabled: false,
        supportedMethods: def.supportedMethods,
        preferredMethod: def.supportedMethods[0] || "api",
        vendorPatterns: def.defaultVendorPatterns,
        settings: {},
        portalUrl: def.defaultPortalUrl,
        emailSenderPatterns: def.defaultEmailSenderPatterns,
      });
    }

    return defaults;
  }

  async save(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(this.configs, null, 2));
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  async getAll(): Promise<ProviderConfig[]> {
    await this.ensureLoaded();
    return [...this.configs];
  }

  async get(id: string): Promise<ProviderConfig | undefined> {
    await this.ensureLoaded();
    return this.configs.find((c) => c.id === id);
  }

  async upsert(config: ProviderConfig): Promise<void> {
    await this.ensureLoaded();
    const idx = this.configs.findIndex((c) => c.id === config.id);
    if (idx >= 0) {
      this.configs[idx] = config;
    } else {
      this.configs.push(config);
    }
    await this.save();
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const before = this.configs.length;
    this.configs = this.configs.filter((c) => c.id !== id);
    if (this.configs.length < before) {
      await this.save();
      return true;
    }
    return false;
  }
}

export const configStore = new ConfigStore();
