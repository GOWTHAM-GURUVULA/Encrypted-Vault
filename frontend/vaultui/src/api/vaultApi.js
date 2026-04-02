const BASE_URL =
  typeof window !== "undefined" && window.electronAPI?.apiBaseUrl
    ? window.electronAPI.apiBaseUrl
    : "http://127.0.0.1:8000/vault";

async function parseError(res, fallbackMessage) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function openVault(password) {
  const res = await fetch(`${BASE_URL}/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Open vault failed"));
  }

  return res.json();
}

export async function openVaultWithRecoveryKey(recoveryKey) {
  const res = await fetch(`${BASE_URL}/open/recovery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recovery_key: recoveryKey }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Recovery unlock failed"));
  }

  return res.json();
}

export async function closeVault(password) {
  const res = await fetch(`${BASE_URL}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Close vault failed"));
  }

  return res.json();
}

export async function getFiles() {
  const res = await fetch(`${BASE_URL}/files`);

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to fetch files"));
  }

  const data = await res.json();

  // backend returns { files: [...] }
  return data.files || [];
}

export async function getRecoveryStatus() {
  const res = await fetch(`${BASE_URL}/recovery-status`);

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to fetch recovery status"));
  }

  return res.json();
}

export async function generateRecoveryKey() {
  const res = await fetch(`${BASE_URL}/recovery-key`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to generate recovery key"));
  }

  return res.json();
}

export async function setVaultPassword(password) {
  const res = await fetch(`${BASE_URL}/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to update password"));
  }

  return res.json();
}

export async function setFileCategory(filename, category) {
  const res = await fetch(`${BASE_URL}/category/${encodeURIComponent(filename)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to update category"));
  }

  return res.json();
}

export async function uploadFile(fileOrPath) {
  const path =
    typeof fileOrPath === "string"
      ? fileOrPath
      : fileOrPath?.path;

  if (!path) {
    throw new Error("No file path available for upload");
  }

  const formData = new FormData();
  formData.append("path", path);

  const res = await fetch(`${BASE_URL}/add`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Upload failed"));
  }

  return res.json();
}

export async function removeFile(filename) {
  const res = await fetch(`${BASE_URL}/delete/${encodeURIComponent(filename)}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Delete failed"));
  }

  return res.json();
}

export async function restoreFile(filename) {
  const res = await fetch(`${BASE_URL}/restore/${encodeURIComponent(filename)}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Restore failed"));
  }

  return res.json();
}
