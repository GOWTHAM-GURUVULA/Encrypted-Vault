import { useEffect, useState } from "react";
import "./App.css";
import vaultImg from "./assets/vault.png";
import {
  closeVault,
  generateRecoveryKey,
  getFiles,
  getRecoveryStatus,
  openVault,
  openVaultWithRecoveryKey,
  removeFile,
  restoreFile,
  setVaultPassword,
  uploadFile,
} from "./api/vaultApi";

const PROMO_FEED_URL = import.meta.env.VITE_PROMO_FEED_URL?.trim() || "";
const BUNDLED_PROMOS = [
  {
    id: "photo-banner",
    label: "Upgrade",
    title: "Get Encrypted Vault Pro",
    body: "Unlock premium features, backup tools, and advanced recovery options.",
    imageUrl: "https://your-site.com/banners/pro-banner.jpg",
    cta: "Learn More",
    url: "https://your-site.com/pro",
  },
  {
    id: "video-banner",
    label: "New",
    title: "See the latest release",
    body: "Play a short muted promo or feature video inside the ad card.",
    videoUrl: "https://your-site.com/banners/release-video.mp4",
    posterUrl: "https://your-site.com/banners/release-poster.jpg",
    showControls: false,
    cta: "Watch More",
    url: "https://your-site.com/releases",
  },
  {
    id: "photo-banner-2",
    label: "Offer",
    title: "Launch week discount",
    body: "Offer a limited-time upgrade or seasonal promotion to your users.",
    imageUrl: "https://your-site.com/banners/offer-banner.jpg",
    cta: "View Offer",
    url: "https://your-site.com/offers",
  },
  {
    id: "video-banner-2",
    label: "Demo",
    title: "Watch a quick feature demo",
    body: "Show how folder view, recovery key, or upcoming premium tools work.",
    videoUrl: "https://your-site.com/banners/demo-video.mp4",
    posterUrl: "https://your-site.com/banners/demo-poster.jpg",
    showControls: false,
    cta: "See Demo",
    url: "https://your-site.com/demo",
  },
  {
    id: "support-banner",
    label: "Support",
    title: "Support Encrypted Vault",
    body: "Use this slot for donations, sponsorship, or community announcements.",
    imageUrl: "https://your-site.com/banners/support-banner.jpg",
    cta: "Support Now",
    url: "https://your-site.com/support",
  },
];

function inferCategory(filename) {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(extension)) {
    return "Images";
  }
  if (["pdf", "doc", "docx", "txt", "ppt", "pptx", "xls", "xlsx"].includes(extension)) {
    return "Documents";
  }
  if (["py", "js", "jsx", "ts", "tsx", "java", "c", "cpp", "html", "css", "json"].includes(extension)) {
    return "Projects";
  }
  if (["csv", "bank", "invoice"].includes(extension)) {
    return "Finance";
  }

  return "Personal";
}

export default function App() {
  const [secret, setSecret] = useState("");
  const [loginMode, setLoginMode] = useState("password");
  const [unlocked, setUnlocked] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState({ configured: false, pending: false });
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [openedCategory, setOpenedCategory] = useState("");
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [promos, setPromos] = useState([]);

  async function refreshFiles() {
    const data = await getFiles();
    setFiles(data);
  }

  async function refreshRecoveryStatus() {
    const data = await getRecoveryStatus();
    setRecoveryStatus(data);
  }

  useEffect(() => {
    if (unlocked) {
      loadVaultData();
    }
  }, [unlocked]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPromos() {
      if (!unlocked || !isOnline) {
        setPromos([]);
        return;
      }

      if (!PROMO_FEED_URL) {
        setPromos([]);
        return;
      }

      try {
        const res = await fetch(PROMO_FEED_URL, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Promo feed unavailable");
        }

        const data = await res.json();
        if (!cancelled) {
          setPromos(Array.isArray(data?.items) && data.items.length > 0 ? data.items : BUNDLED_PROMOS);
        }
      } catch {
        if (!cancelled) {
          setPromos(BUNDLED_PROMOS);
        }
      }
    }

    loadPromos();

    return () => {
      cancelled = true;
    };
  }, [unlocked, isOnline]);

  useEffect(() => {
    function preventWindowDrop(event) {
      event.preventDefault();
    }

    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, []);

  async function loadVaultData() {
    try {
      await Promise.all([refreshFiles(), refreshRecoveryStatus()]);
    } catch (e) {
      setError(e.message);
      console.error("Failed to fetch vault data", e);
    }
  }

  async function unlockVault() {
    setError("");
    setLoading(true);
    try {
      if (loginMode === "recovery") {
        await openVaultWithRecoveryKey(secret);
      } else {
        await openVault(secret);
      }
      setUnlocked(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadSelectedPath(path) {
    try {
      setError("");
      await uploadFile(path);
      await refreshFiles();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddFile() {
    const path = await window.electronAPI.selectFile();
    if (!path) return;

    await uploadSelectedPath(path);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    if (event.currentTarget === event.target) {
      setIsDragging(false);
    }
  }

  async function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const droppedPaths = Array.from(event.dataTransfer?.files || [])
      .map((file) => window.electronAPI?.getPathForFile?.(file) || file.path)
      .filter(Boolean);

    if (droppedPaths.length === 0) {
      setError("Drop a file from your computer to add it to the vault.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      for (const path of droppedPaths) {
        await uploadFile(path);
      }
      await refreshFiles();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenFile(name) {
    const res = await window.electronAPI.openFile(name);
    if (res && !res.success) {
      alert("Error: " + res.error);
    }
  }

  async function handleRestore(name) {
    try {
      setError("");
      await restoreFile(name);
      await refreshFiles();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(name) {
    if (!confirm("Delete permanently?")) return;

    try {
      setError("");
      await removeFile(name);
      await refreshFiles();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleGenerateRecoveryKey() {
    try {
      setError("");
      const data = await generateRecoveryKey();
      setRecoveryKey(data.recovery_key);
      await refreshRecoveryStatus();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSetPassword() {
    try {
      setError("");
      await setVaultPassword(newPassword);
      setSecret(newPassword);
      setLoginMode("password");
      setNewPassword("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCopyRecoveryKey() {
    if (!recoveryKey) return;

    try {
      if (window.electronAPI?.copyText) {
        await window.electronAPI.copyText(recoveryKey);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recoveryKey);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopiedRecovery(true);
      window.setTimeout(() => setCopiedRecovery(false), 1600);
    } catch (e) {
      setError("Failed to copy recovery key.");
    }
  }

  async function lockVault() {
    if (loading) return;

    try {
      setError("");
      setLoading(true);
      await closeVault(loginMode === "password" ? secret : "");
      setUnlocked(false);
      setSecret("");
      setFiles([]);
      setRecoveryKey("");
      setRecoveryStatus({ configured: false, pending: false });
      setNewPassword("");
      setLoginMode("password");
      setGroupByCategory(false);
      setActiveView("overview");
      setOpenedCategory("");
      setCopiedRecovery(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const normalizedFiles = files.map((file) => ({
    ...file,
    category: inferCategory(file.name),
  }));

  const groupedFiles = normalizedFiles.reduce((groups, file) => {
    const category = file.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(file);
    return groups;
  }, {});

  function renderFileRow(file) {
    return (
      <div className="file-card modern" key={file.name}>
        <button className="file-main" onClick={() => handleOpenFile(file.name)}>
          <div>
            <div className="file-name">{file.name}</div>
          </div>
        </button>
        <div className="file-meta">
          <span className="category-badge">{file.category}</span>
          <div className="actions">
            <button className="ghost" onClick={() => handleRestore(file.name)}>
              Restore
            </button>
            <button className="ghost danger" onClick={() => handleDelete(file.name)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCategoryFolder(category, grouped) {
    return (
      <button
        className="category-folder"
        key={category}
        onClick={() => setOpenedCategory(category)}
      >
        <div className="category-folder-top">
          <div>
            <p className="eyebrow">Category</p>
            <h4>{category}</h4>
          </div>
          <span>{grouped.length} items</span>
        </div>
      </button>
    );
  }

  function renderPromoPanel() {
    if (!isOnline || promos.length === 0) {
      return null;
    }

    return (
      <aside className="promo-panel">
        <div className="promo-panel-header">
          <div>
            <p className="eyebrow">Updates</p>
            <h3>From the publisher</h3>
          </div>
          <span className="status-pill neutral">Online</span>
        </div>
          <div className="promo-list">
            {promos.map((promo) => (
            <article className="promo-card" key={promo.id || promo.title}>
              {promo.imageUrl && (
                <div className="promo-media">
                  <img src={promo.imageUrl} alt={promo.title || promo.label || "Promo banner"} />
                </div>
              )}
              {!promo.imageUrl && promo.videoUrl && (
                <div className="promo-media">
                  <video
                    src={promo.videoUrl}
                    poster={promo.posterUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={Boolean(promo.showControls)}
                  />
                </div>
              )}
              <span className="promo-label">{promo.label || "Update"}</span>
              <h4>{promo.title}</h4>
              <p>{promo.body}</p>
              {promo.url && (
                <a
                  className="promo-link"
                  href={promo.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {promo.cta || "Open"}
                </a>
              )}
            </article>
          ))}
        </div>
      </aside>
    );
  }

  if (!unlocked) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="brand-lockup">
            <div className="brand-icon-wrap">
              <img src={vaultImg} width="72" alt="vault" />
            </div>
            <div>
              <p className="eyebrow">Encrypted Secure Vault</p>
              <h1>Secure Local Storage</h1>
              <p className="auth-copy">Unlock your vault with a password or your recovery key.</p>
            </div>
          </div>
          <div className="auth-toggle">
            <button
              className={loginMode === "password" ? "tab active" : "tab"}
              onClick={() => setLoginMode("password")}
              disabled={loginMode === "password"}
            >
              Password
            </button>
            <button
              className={loginMode === "recovery" ? "tab active" : "tab"}
              onClick={() => setLoginMode("recovery")}
              disabled={loginMode === "recovery"}
            >
              Recovery Key
            </button>
          </div>
          <label className="field-label" htmlFor="vault-secret">
            {loginMode === "password" ? "Vault Password" : "Recovery Key"}
          </label>
          <input
            id="vault-secret"
            type={loginMode === "password" ? "password" : "text"}
            placeholder={loginMode === "password" ? "Enter password" : "Enter recovery key"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <button className="primary-action" onClick={unlockVault} disabled={loading || !secret.trim()}>
            {loading ? "Unlocking..." : "Unlock Vault"}
          </button>
          {error && <p className="error auth-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <header className="app-header">
        <div className="brand-lockup compact">
          <div className="brand-icon-wrap small">
            <img src={vaultImg} width="38" alt="vault" />
          </div>
          <div>
            <p className="eyebrow">Encrypted Secure Vault</p>
            <h2>Vault Dashboard</h2>
          </div>
        </div>
        <div className="header-actions">          <div className="recovery-inline">
            <span className={recoveryStatus.configured ? "status-pill ready" : "status-pill pending"}>
              {recoveryStatus.configured ? "Recovery Ready" : "Recovery Pending"}
            </span>
            {recoveryKey ? (
              <>
                <code>{recoveryKey}</code>
                <button className="icon-button" onClick={handleCopyRecoveryKey} title="Copy recovery key">
                  <span className="copy-icon" aria-hidden="true" />
                  <span>{copiedRecovery ? "Copied" : "Copy"}</span>
                </button>
              </>
            ) : (
              <button className="secondary-action header-action" onClick={handleGenerateRecoveryKey}>
                Show Key
              </button>
            )}
          </div>
          <button className="danger" onClick={lockVault} disabled={loading}>
            {loading ? "Locking..." : "Lock Vault"}
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        {error && <div className="status-banner error">{error}</div>}

        <section className="view-switcher">
          <button
            className={activeView === "overview" ? "toggle-chip active" : "toggle-chip"}
            onClick={() => setActiveView("overview")}
          >
            Overview
          </button>
          <button
            className={activeView === "files" ? "toggle-chip active" : "toggle-chip"}
            onClick={() => setActiveView("files")}
          >
            Files
          </button>
        </section>

        {activeView === "overview" ? (
          <div className="overview-grid">
            <section
              className={isDragging ? "overview-layout overview-layout-active" : "overview-layout"}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <button
                className={isDragging ? "hero-card dropzone overview-dropzone overview-tap-target active" : "hero-card dropzone overview-dropzone overview-tap-target"}
                onClick={handleAddFile}
                disabled={loading}
                type="button"
              >
                <div>
                  <p className="eyebrow">Vault Actions</p>
                  <h3>{isDragging ? "Drop files anywhere here" : loading ? "Adding files..." : "Tap or drag files here"}</h3>
                </div>
              </button>

              {recoveryKey && (
                <section className="recovery-card">
                  <div className="recovery-key-box compact">
                    <div>
                      <strong>Recovery key created</strong>
                      <span>This is only shown in this session.</span>
                    </div>
                    <p>{recoveryKey}</p>
                  </div>
                </section>
              )}

              {loginMode === "recovery" && (
                <section className="recovery-card">
                  <div className="password-reset-box">
                    <div>
                      <strong>Reset Password</strong>
                      <p className="muted">You unlocked with the recovery key. Set a new password before relocking the vault.</p>
                    </div>
                    <div className="password-reset-actions">
                      <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button className="secondary-action" onClick={handleSetPassword} disabled={!newPassword.trim()}>
                        Save New Password
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </section>

            {renderPromoPanel()}
          </div>
        ) : (
          <section className="files-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Files</p>
                  <h3>Vault Contents</h3>
                </div>
                <div className="view-toggle">
                  <button
                    className={groupByCategory ? "toggle-chip" : "toggle-chip active"}
                    onClick={() => {
                      setGroupByCategory(false);
                      setOpenedCategory("");
                    }}
                  >
                    All Files
                  </button>
                  <button
                    className={groupByCategory ? "toggle-chip active" : "toggle-chip"}
                    onClick={() => {
                      setGroupByCategory(true);
                      setOpenedCategory("");
                    }}
                  >
                    Category View
                  </button>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="empty-state">
                  <p>Vault is empty</p>
                  <span>Add a file to begin securing your documents.</span>
                </div>
              ) : groupByCategory ? (
                openedCategory ? (
                  <div className="category-open-view">
                    <div className="category-open-header">
                      <button className="ghost folder-back" onClick={() => setOpenedCategory("")}>
                        Back to Categories
                      </button>
                      <div>
                        <p className="eyebrow">Folder</p>
                        <h3>{openedCategory}</h3>
                      </div>
                    </div>
                    <div className="file-list modern">
                      {(groupedFiles[openedCategory] || []).map((file) => renderFileRow(file))}
                    </div>
                  </div>
                ) : (
                  <div className="category-groups">
                    {Object.entries(groupedFiles).map(([category, grouped]) =>
                      renderCategoryFolder(category, grouped)
                    )}
                  </div>
                )
              ) : (
                <div className="file-list modern">
                  {normalizedFiles.map((file) => renderFileRow(file))}
                </div>
              )}
            </section>
        )}
      </main>
    </div>
  );
}
