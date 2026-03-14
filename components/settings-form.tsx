"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import type { DisplayConfig } from "@/lib/types";

export function SettingsForm({ config }: { config: DisplayConfig | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [baseUrl, setBaseUrl] = useState(config?.navidrome.baseUrl || "");
  const [username, setUsername] = useState(config?.navidrome.username || "");
  const [password, setPassword] = useState("");
  const [lastfmApiKey, setLastfmApiKey] = useState("");
  const [requestWebhookUrl, setRequestWebhookUrl] = useState(config?.integrations.requestWebhookUrl || "");
  const [recentReleaseWindowDays, setRecentReleaseWindowDays] = useState(
    String(config?.preferences.recentReleaseWindowDays || 45)
  );
  const [autoRefreshHours, setAutoRefreshHours] = useState(
    String(config?.preferences.autoRefreshHours || 12)
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          baseUrl,
          username,
          password,
          lastfmApiKey,
          requestWebhookUrl,
          recentReleaseWindowDays: Number(recentReleaseWindowDays),
          autoRefreshHours: Number(autoRefreshHours)
        })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(payload.error || "Could not save settings.");
        return;
      }

      setPassword("");
      setLastfmApiKey("");
      setStatus("Settings saved.");
      router.refresh();
    });
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="field">
        <span>Navidrome URL</span>
        <input
          name="baseUrl"
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="http://navidrome:4533"
          required
          value={baseUrl}
        />
      </label>

      <div className="form-grid two-up">
        <label className="field">
          <span>Username</span>
          <input
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            required
            value={username}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={config?.navidrome.hasPassword ? "Saved on server" : "App password"}
            type="password"
            value={password}
          />
        </label>
      </div>

      <div className="form-grid two-up">
        <label className="field">
          <span>Last.fm API key</span>
          <input
            name="lastfmApiKey"
            onChange={(event) => setLastfmApiKey(event.target.value)}
            placeholder={config?.integrations.hasLastfmApiKey ? "Saved on server" : "Optional"}
            value={lastfmApiKey}
          />
        </label>

        <label className="field">
          <span>Request webhook URL</span>
          <input
            name="requestWebhookUrl"
            onChange={(event) => setRequestWebhookUrl(event.target.value)}
            placeholder="Optional custom downloader endpoint"
            value={requestWebhookUrl}
          />
        </label>
      </div>

      <div className="form-grid two-up">
        <label className="field">
          <span>Recent release window (days)</span>
          <input
            max={180}
            min={7}
            name="recentReleaseWindowDays"
            onChange={(event) => setRecentReleaseWindowDays(event.target.value)}
            type="number"
            value={recentReleaseWindowDays}
          />
        </label>

        <label className="field">
          <span>Auto refresh every (hours)</span>
          <input
            max={168}
            min={1}
            name="autoRefreshHours"
            onChange={(event) => setAutoRefreshHours(event.target.value)}
            type="number"
            value={autoRefreshHours}
          />
        </label>
      </div>

      <div className="actions-row">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save settings"}
        </button>
      </div>
      <p className="status-line">{status}</p>
    </form>
  );
}
