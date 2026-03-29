import { useSettingsStore } from "../stores/settingsStore";

export function SettingsScreen() {
  const apiBaseUrl = useSettingsStore((s) => s.apiBaseUrl);
  const setApiBaseUrl = useSettingsStore((s) => s.setApiBaseUrl);
  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Réglages</div><div className="screen-subtitle">Connexions et préférences</div></div>
      <div className="settings-section">
        <div className="settings-section-title">API</div>
        <div className="settings-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="settings-row-label">URL du worker Cloudflare</div>
            <div className="settings-row-desc">Exemple : https://manitradepro-api.xxx.workers.dev</div>
          </div>
          <input className="input-field" value={apiBaseUrl} onChange={(e)=>setApiBaseUrl(e.target.value)} placeholder="https://...workers.dev" />
        </div>
      </div>
    </div>
  );
}
