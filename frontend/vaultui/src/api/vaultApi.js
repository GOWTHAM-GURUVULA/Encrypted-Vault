const BASE_URL = "http://127.0.0.1:8000/vault";

export async function openVault(password) {
  const res = await fetch(`${BASE_URL}/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) throw new Error("Open vault failed");
  return res.json();
}

export async function getFiles() {
  const res = await fetch(`${BASE_URL}/files`);
  return res.json();
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

export async function removeFile(filename) {
  return fetch(`${BASE_URL}/remove/${filename}`, { method: "DELETE" });
}

export async function restoreFile(filename) {
  return fetch(`${BASE_URL}/restore/${filename}`, { method: "POST" });
}
