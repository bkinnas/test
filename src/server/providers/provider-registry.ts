import type { ProviderDefinition } from "../../shared/types.js";
import type { InvoiceProvider } from "../types/index.js";

/**
 * Central registry for all invoice providers.
 * Providers self-register on import; the aggregator queries this registry.
 */
class ProviderRegistry {
  private providers = new Map<string, InvoiceProvider>();
  private definitions = new Map<string, ProviderDefinition>();

  register(provider: InvoiceProvider, definition: ProviderDefinition): void {
    this.providers.set(definition.id, provider);
    this.definitions.set(definition.id, definition);
    console.log(`[registry] Registered provider: ${definition.name}`);
  }

  getProvider(id: string): InvoiceProvider | undefined {
    return this.providers.get(id);
  }

  getDefinition(id: string): ProviderDefinition | undefined {
    return this.definitions.get(id);
  }

  getAllProviders(): InvoiceProvider[] {
    return Array.from(this.providers.values());
  }

  getAllDefinitions(): ProviderDefinition[] {
    return Array.from(this.definitions.values());
  }

  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton
export const registry = new ProviderRegistry();
