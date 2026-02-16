import { Router } from "express";
import { v4 as uuid } from "uuid";
import { registry } from "../providers/provider-registry.js";
import { configStore } from "../services/config-store.js";
import type {
  ApiResponse,
  ProviderConfig,
  ProviderDefinition,
} from "../../shared/types.js";

export const providersRouter = Router();

/**
 * GET /api/providers/definitions
 * List all available provider definitions (templates).
 */
providersRouter.get("/definitions", async (_req, res) => {
  const definitions = registry.getAllDefinitions();
  res.json({
    success: true,
    data: definitions,
  } satisfies ApiResponse<ProviderDefinition[]>);
});

/**
 * GET /api/providers/configs
 * List all configured provider instances.
 */
providersRouter.get("/configs", async (_req, res) => {
  const configs = await configStore.getAll();
  res.json({
    success: true,
    data: configs,
  } satisfies ApiResponse<ProviderConfig[]>);
});

/**
 * GET /api/providers/configs/:id
 * Get a specific provider config.
 */
providersRouter.get("/configs/:id", async (req, res) => {
  const config = await configStore.get(req.params.id!);
  if (!config) {
    res
      .status(404)
      .json({ success: false, error: "Provider config not found" } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data: config } satisfies ApiResponse<ProviderConfig>);
});

/**
 * PUT /api/providers/configs/:id
 * Update (or create) a provider config.
 */
providersRouter.put("/configs/:id", async (req, res) => {
  const config = req.body as ProviderConfig;
  config.id = req.params.id!;

  await configStore.upsert(config);
  res.json({ success: true, data: config } satisfies ApiResponse<ProviderConfig>);
});

/**
 * POST /api/providers/configs
 * Create a new custom provider config.
 */
providersRouter.post("/configs", async (req, res) => {
  const body = req.body as Partial<ProviderConfig>;
  const config: ProviderConfig = {
    id: `custom-${uuid().slice(0, 8)}`,
    name: body.name || "New Provider",
    enabled: body.enabled ?? false,
    supportedMethods: body.supportedMethods || ["email", "portal"],
    preferredMethod: body.preferredMethod || "email",
    vendorPatterns: body.vendorPatterns || [],
    settings: body.settings || {},
    portalUrl: body.portalUrl,
    emailSenderPatterns: body.emailSenderPatterns,
  };

  await configStore.upsert(config);
  res.status(201).json({
    success: true,
    data: config,
  } satisfies ApiResponse<ProviderConfig>);
});

/**
 * DELETE /api/providers/configs/:id
 * Remove a provider config.
 */
providersRouter.delete("/configs/:id", async (req, res) => {
  const removed = await configStore.remove(req.params.id!);
  if (!removed) {
    res
      .status(404)
      .json({ success: false, error: "Provider config not found" } satisfies ApiResponse);
    return;
  }
  res.json({ success: true } satisfies ApiResponse);
});
