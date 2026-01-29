import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function VaultLogin({ onOpen }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const callVault = async (endpoint) => {
    setError("");

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail);
        return;
      }

      onOpen(true);
    } catch (err) {
      setError("Backend not reachable");
    }
  };

  return (
    <div style={{ border: "1px solid gray", padding: 10 }}>
      <h3>Vault Access</h3>

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={() => callVault("/vault/init")}>
        Set Password
      </button>

      <button onClick={() => callVault("/vault/open")}>
        Open Vault
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
