import React, { useEffect, useState } from "react";
import { useApi, useAsync } from "../hooks/useApi.js";
import type {
  ProviderConfig,
  ProviderDefinition,
  FetchMethod,
} from "../../shared/types.js";

export function ProviderManager() {
  const api = useApi();
  const {
    data: configs,
    loading,
    error,
    execute,
    setData: setConfigs,
  } = useAsync<ProviderConfig[]>();
  const {
    data: definitions,
    execute: loadDefs,
  } = useAsync<ProviderDefinition[]>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);

  useEffect(() => {
    execute(() => api.get<ProviderConfig[]>("/providers/configs"));
    loadDefs(() => api.get<ProviderDefinition[]>("/providers/definitions"));
  }, []);

  const handleSave = async (config: ProviderConfig) => {
    await api.put(`/providers/configs/${config.id}`, config);
    const updated = await api.get<ProviderConfig[]>("/providers/configs");
    setConfigs(updated);
    setEditingId(null);
  };

  const handleToggle = async (config: ProviderConfig) => {
    const updated = { ...config, enabled: !config.enabled };
    await api.put(`/providers/configs/${updated.id}`, updated);
    const all = await api.get<ProviderConfig[]>("/providers/configs");
    setConfigs(all);
  };

  const handleAddCustom = async (name: string, vendorPatterns: string[]) => {
    await api.post("/providers/configs", {
      name,
      vendorPatterns,
      enabled: false,
      supportedMethods: ["email", "outlook", "portal"],
      preferredMethod: "email",
      settings: {},
    });
    const updated = await api.get<ProviderConfig[]>("/providers/configs");
    setConfigs(updated);
    setShowAddCustom(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this provider configuration?")) return;
    await api.del(`/providers/configs/${id}`);
    const updated = await api.get<ProviderConfig[]>("/providers/configs");
    setConfigs(updated);
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <div className="spinner mr-3" />
        <span className="text-gray-500">Loading providers...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Providers</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure invoice sources. Enable providers and enter credentials to
            fetch invoices automatically.
          </p>
        </div>
        <button
          onClick={() => setShowAddCustom(true)}
          className="btn-secondary"
        >
          + Add Custom Provider
        </button>
      </div>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-red-700">
          Error: {error}
        </div>
      )}

      {/* Add Custom Provider Form */}
      {showAddCustom && (
        <AddCustomForm
          onAdd={handleAddCustom}
          onCancel={() => setShowAddCustom(false)}
        />
      )}

      {/* Provider Cards */}
      <div className="space-y-4">
        {configs?.map((config) => {
          const def = definitions?.find((d) => d.id === config.id) ||
            definitions?.find((d) => d.id === "custom");

          return (
            <div key={config.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <ProviderIcon name={def?.icon || "custom"} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {config.name}
                      </h3>
                      {config.enabled ? (
                        <span className="badge-green">Enabled</span>
                      ) : (
                        <span className="badge-gray">Disabled</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Method: {config.preferredMethod} | Patterns:{" "}
                      {config.vendorPatterns.join(", ") || "none"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(config)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? "bg-brand-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() =>
                      setEditingId(editingId === config.id ? null : config.id)
                    }
                    className="btn-secondary text-sm"
                  >
                    {editingId === config.id ? "Close" : "Configure"}
                  </button>
                  {config.id.startsWith("custom-") && (
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="btn-danger text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded config form */}
              {editingId === config.id && (
                <ProviderConfigForm
                  config={config}
                  definition={def}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProviderConfigForm({
  config,
  definition,
  onSave,
  onCancel,
}: {
  config: ProviderConfig;
  definition?: ProviderDefinition;
  onSave: (config: ProviderConfig) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProviderConfig>({ ...config });
  const [saving, setSaving] = useState(false);

  const updateSetting = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t pt-6 space-y-4">
      {/* Vendor patterns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vendor Name Patterns (comma-separated)
        </label>
        <input
          type="text"
          className="input"
          value={form.vendorPatterns.join(", ")}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              vendorPatterns: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
          placeholder="e.g. google ads, google advertising"
        />
        <p className="text-xs text-gray-400 mt-1">
          These patterns match against vendor names in your Brex export.
          Supports wildcards (*).
        </p>
      </div>

      {/* Preferred fetch method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fetch Method
        </label>
        <select
          className="input"
          value={form.preferredMethod}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              preferredMethod: e.target.value as FetchMethod,
            }))
          }
        >
          {form.supportedMethods.map((m) => (
            <option key={m} value={m}>
              {m === "api"
                ? "API (Direct)"
                : m === "email"
                  ? "Email (IMAP)"
                  : m === "outlook"
                    ? "Outlook (Desktop)"
                    : "Portal (Scraping)"}
            </option>
          ))}
        </select>
      </div>

      {/* Email sender patterns (used by both IMAP email and Outlook) */}
      {(form.supportedMethods.includes("email") ||
        form.supportedMethods.includes("outlook")) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Sender Patterns
          </label>
          <input
            type="text"
            className="input"
            value={form.emailSenderPatterns?.join(", ") || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                emailSenderPatterns: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="e.g. billing@company.com, noreply@company.com"
          />
        </div>
      )}

      {/* Portal URL */}
      {form.supportedMethods.includes("portal") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Portal URL
          </label>
          <input
            type="url"
            className="input"
            value={form.portalUrl || ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, portalUrl: e.target.value }))
            }
            placeholder="https://..."
          />
        </div>
      )}

      {/* Provider-specific settings */}
      {definition?.requiredSettings?.map((setting) => (
        <div key={setting.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {setting.label}
            {setting.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <input
            type={setting.type === "password" ? "password" : "text"}
            className="input"
            value={form.settings[setting.key] || ""}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            required={setting.required}
          />
          {setting.helpText && (
            <p className="text-xs text-gray-400 mt-1">{setting.helpText}</p>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddCustomForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, vendorPatterns: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [patterns, setPatterns] = useState("");

  return (
    <div className="card mb-4 bg-brand-50 border-brand-200">
      <h3 className="font-semibold text-gray-900 mb-4">Add Custom Provider</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider Name
          </label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. TikTok Ads, Shopify"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor Name Patterns (comma-separated)
          </label>
          <input
            type="text"
            className="input"
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            placeholder="e.g. tiktok, bytedance"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() =>
              onAdd(
                name,
                patterns
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            disabled={!name.trim()}
            className="btn-primary"
          >
            Add Provider
          </button>
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderIcon({ name }: { name: string }) {
  const iconMap: Record<string, string> = {
    google: "G",
    meta: "M",
    criteo: "C",
    amazon: "A",
    applovin: "AL",
    custom: "+",
  };

  const colorMap: Record<string, string> = {
    google: "bg-blue-100 text-blue-700",
    meta: "bg-indigo-100 text-indigo-700",
    criteo: "bg-orange-100 text-orange-700",
    amazon: "bg-yellow-100 text-yellow-700",
    applovin: "bg-purple-100 text-purple-700",
    custom: "bg-gray-100 text-gray-700",
  };

  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
        colorMap[name] || colorMap.custom
      }`}
    >
      {iconMap[name] || name[0]?.toUpperCase() || "?"}
    </div>
  );
}
