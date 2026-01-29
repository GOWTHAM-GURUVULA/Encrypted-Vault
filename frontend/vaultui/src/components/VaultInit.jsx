import { useState } from "react";

export default function VaultInit({ onInit }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const initVault = async () => {
    const res = await fetch("http://127.0.0.1:8000/vault/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    setMsg(data.message);
    onInit();
  };

  return (
    <div>
      <h3>Set Vault Password (first time)</h3>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={initVault}>Set Password</button>
      <p>{msg}</p>
    </div>
  );
}
