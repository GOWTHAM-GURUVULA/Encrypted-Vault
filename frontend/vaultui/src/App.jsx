import { useEffect, useState } from "react";
import "./App.css";
import vault from "./assets/vault.png";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (unlocked) loadFiles();
  }, [unlocked]);

  async function unlockVault() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/vault/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error("Invalid password");
      setUnlocked(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    const res = await fetch(`${API}/vault/files`);
    const data = await res.json();
    setFiles(data.files || []);
  }

  async function addFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    await fetch(`${API}/vault/add`, {
      method: "POST",
      body: form,
    });

    loadFiles();
  }

  async function restoreFile(id) {
    await fetch(`${API}/vault/restore/${id}`, { method: "POST" });
    loadFiles();
  }

  async function deleteFile(id) {
    await fetch(`${API}/vault/delete/${id}`, { method: "POST" });
    loadFiles();
  }

  function lockVault() {
    setUnlocked(false);
    setPassword("");
    setFiles([]);
  }

  // 🔐 LOGIN SCREEN
  if (!unlocked) {
    return (
      <div className="screen center">
        <div className="card">
          <img src={vault} width="100" style={{ marginBottom: "10px" }} />
          <h1>Encrypted Vault</h1>

          <input
            type="password"
            placeholder="Vault password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={unlockVault} disabled={loading}>
            {loading ? "Unlocking..." : "Unlock"}
          </button>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  // 📁 VAULT DASHBOARD
  return (
    <div className="screen">
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={vault} width="40" />
          <h2>Vault Dashboard</h2>
        </div>

        <button className="danger" onClick={lockVault}>
          Lock Vault
        </button>
      </header>

      <div className="toolbar">
        <label className="file-btn">
          ➕ Add File
          <input type="file" hidden onChange={addFile} />
        </label>
      </div>

      <div className="file-list">
        {files.length === 0 && <p className="muted">Vault is empty</p>}

        {files.map((f) => (
          <div className="file-card" key={f.id}>
            <span>{f.name}</span>
            <div className="actions">
              <button onClick={() => restoreFile(f.id)}>Restore</button>
              <button className="danger" onClick={() => deleteFile(f.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
