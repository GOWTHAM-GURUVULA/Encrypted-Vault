import os
import shutil
import zipfile
import json
import stat
import threading
from cryptography.exceptions import InvalidTag

if __package__ and __package__.startswith("backend."):
    from ..security import crypto_core
else:
    from security import crypto_core

BASE_DIR = os.environ.get(
    "ENCRYPTED_VAULT_DATA_DIR",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
VAULT_ENC = os.path.join(BASE_DIR, "vault.enc")
VAULT_PLAIN = os.path.join(BASE_DIR, "vault_plain")
VAULT_ZIP = os.path.join(BASE_DIR, "vault.zip")
INDEX_FILE = ".vault_index.json"
LEGACY_INDEX_FILE = "vault_index.json"

os.makedirs(BASE_DIR, exist_ok=True)


def infer_category(filename: str) -> str:
    extension = os.path.splitext(filename)[1].lower()

    if extension in {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}:
        return "Images"
    if extension in {".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx", ".xls", ".xlsx"}:
        return "Documents"
    if extension in {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".html", ".css", ".json"}:
        return "Projects"
    if extension in {".csv", ".bank", ".invoice"}:
        return "Finance"

    return "Personal"


def normalize_category(category: str | None, filename: str) -> str:
    saved_category = (category or "").strip()
    inferred_category = infer_category(filename)

    if not saved_category:
        return inferred_category

    if saved_category in {"Uncategorized", "Personal"} and inferred_category != "Personal":
        return inferred_category

    return saved_category

class ContainerVault:
    def __init__(self):
        self.is_open = False
        self.master_key = None
        self.wrapped_keys = {}
        self.pending_recovery_key = None
        self._operation_lock = threading.RLock()

    def open_vault(self, password: str):
        self._open_existing_vault(password, "password")

    def open_with_recovery_key(self, recovery_key: str):
        self._open_existing_vault(recovery_key, "recovery")

    def close_vault(self, password: str | None):
        with self._operation_lock:
            self._close_vault(password)

    def _close_vault(self, password: str | None):
        if not self.is_open:
            raise Exception("Vault not open")

        password = (password or "").strip()
        if password:
            self.wrapped_keys["password"] = crypto_core.wrap_key(
                self.master_key,
                password,
            )
        elif "password" not in self.wrapped_keys:
            raise Exception("Set a password before locking the vault.")

        if self.pending_recovery_key:
            self.wrapped_keys["recovery"] = crypto_core.wrap_key(
                self.master_key,
                self.pending_recovery_key,
            )

        with zipfile.ZipFile(VAULT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(VAULT_PLAIN):
                for file in files:
                    full = os.path.join(root, file)
                    arc = os.path.relpath(full, VAULT_PLAIN)
                    zipf.write(full, arc)

        with open(VAULT_ZIP, "rb") as f:
            encrypted_payload = crypto_core.encrypt_with_key(
                f.read(),
                self.master_key,
            )

        with open(VAULT_ENC, "wb") as f:
            f.write(
                crypto_core.serialize_vault(
                    encrypted_payload,
                    self.wrapped_keys,
                )
            )

        if os.path.exists(VAULT_ZIP):
            os.remove(VAULT_ZIP)

        try:
            if os.path.exists(VAULT_PLAIN):
                shutil.rmtree(VAULT_PLAIN, onerror=self._handle_remove_readonly)
        except PermissionError as exc:
            locked_path = exc.filename or VAULT_PLAIN
            raise Exception(
                f"Cannot lock vault while this file is open: {locked_path}"
            ) from exc

        self.is_open = False
        self.pending_recovery_key = None

    def has_recovery_key(self):
        return "recovery" in self.wrapped_keys or self.pending_recovery_key is not None

    def generate_recovery_key(self):
        if not self.is_open:
            raise Exception("Vault not open")

        if "recovery" in self.wrapped_keys:
            raise Exception("Recovery key is already configured.")

        if not self.pending_recovery_key:
            self.pending_recovery_key = crypto_core.generate_recovery_key()

        return self.pending_recovery_key

    def set_password(self, password: str):
        if not self.is_open:
            raise Exception("Vault not open")

        password = (password or "").strip()
        if not password:
            raise Exception("Password cannot be empty.")

        self.wrapped_keys["password"] = crypto_core.wrap_key(
            self.master_key,
            password,
        )

    def recovery_status(self):
        return {
            "configured": "recovery" in self.wrapped_keys,
            "pending": self.pending_recovery_key is not None,
        }

    def _open_existing_vault(self, secret: str, secret_type: str):
        if self.is_open:
            return
        
        if not os.path.exists(VAULT_ENC):
            os.makedirs(VAULT_PLAIN, exist_ok=True)
            self.is_open = True
            self.master_key = crypto_core.generate_master_key()
            self.wrapped_keys = {}
            self.pending_recovery_key = None
            return

        os.makedirs(VAULT_PLAIN, exist_ok=True)
        self._clear_plain_vault()

        try:
            with open(VAULT_ENC, "rb") as f:
                encrypted = f.read()

            parsed_vault = crypto_core.parse_vault(encrypted)
            if parsed_vault:
                wrapped_key = parsed_vault["wrapped_keys"].get(secret_type)
                if not wrapped_key:
                    raise Exception(
                        f"Recovery key is not configured for this vault."
                        if secret_type == "recovery"
                        else "Incorrect password."
                    )
                self.master_key = crypto_core.unwrap_key(wrapped_key, secret)
                decrypted = crypto_core.decrypt_with_key(
                    parsed_vault["encrypted_payload"],
                    self.master_key,
                )
                self.wrapped_keys = dict(parsed_vault["wrapped_keys"])
            else:
                if secret_type != "password":
                    raise Exception("Recovery key is not configured for this vault.")
                decrypted = crypto_core.decrypt(encrypted, secret)
                self.master_key = crypto_core.generate_master_key()
                self.wrapped_keys = {}

            with open(VAULT_ZIP, "wb") as f:
                f.write(decrypted)

            with zipfile.ZipFile(VAULT_ZIP, "r") as zipf:
                zipf.extractall(VAULT_PLAIN)

            if os.path.exists(VAULT_ZIP):
                os.remove(VAULT_ZIP)
            if os.path.exists(VAULT_ENC):
                os.remove(VAULT_ENC)
            self.is_open = True
            self.pending_recovery_key = None
        except InvalidTag as exc:
            self._cleanup_temp_files()
            raise Exception(
                "Incorrect recovery key." if secret_type == "recovery" else "Incorrect password."
            ) from exc
        except zipfile.BadZipFile as exc:
            self._cleanup_temp_files()
            raise Exception("Vault data is corrupted or unreadable.") from exc
        except Exception:
            self._cleanup_temp_files()
            raise

    def add_file(self, real_path: str):
        if not self.is_open: raise Exception("Vault not open")
        
        abs_path = os.path.normpath(os.path.abspath(real_path))
        if not os.path.exists(abs_path):
            raise Exception("File not found on system.")

        filename = os.path.basename(abs_path)
        vault_path = os.path.join(VAULT_PLAIN, filename)
        os.makedirs(VAULT_PLAIN, exist_ok=True)

        if os.path.exists(vault_path):
            raise Exception(
                f"A file named '{filename}' already exists in the vault."
            )

        try:
            self._make_writable(abs_path)
            shutil.move(abs_path, vault_path)
        except PermissionError as exc:
            locked_path = exc.filename or abs_path
            raise Exception(
                f"Cannot add this file because it is still open: {locked_path}"
            ) from exc
        except shutil.Error as exc:
            raise Exception(str(exc)) from exc

        index = self._load_index()
        index[filename] = {
            "original_path": abs_path,
            "category": infer_category(filename),
        }
        self._save_index(index)

    def delete_file(self, filename: str):
        if not self.is_open: raise Exception("Vault not open")
        path = os.path.join(VAULT_PLAIN, filename)
        if not os.path.exists(path):
            raise Exception("File missing from vault storage.")

        try:
            self._make_writable(path)
            os.remove(path)
        except PermissionError as exc:
            locked_path = exc.filename or path
            raise Exception(
                f"Cannot delete this file because it is still open: {locked_path}"
            ) from exc
        
        index = self._load_index()
        if filename in index: del index[filename]
        self._save_index(index)

    def list_files(self):
        if not self.is_open:
            return []

        index = self._load_index()
        files = []
        for name in os.listdir(VAULT_PLAIN):
            if name == INDEX_FILE:
                continue
            metadata = index.get(name, {})
            files.append(
                {
                    "name": name,
                    "category": normalize_category(metadata.get("category"), name),
                }
            )
        return files

    def restore_file(self, filename: str):
        if not self.is_open: raise Exception("Vault not open")
        
        index = self._load_index()
        if filename not in index:
            raise Exception("No original path found for this file.")

        original_path = os.path.normpath(index[filename]["original_path"])
        vault_file = os.path.join(VAULT_PLAIN, filename)

        if not os.path.exists(vault_file):
            raise Exception("File missing from vault storage.")

        parent_dir = os.path.dirname(original_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
        try:
            shutil.move(vault_file, original_path)
        except PermissionError as exc:
            locked_path = exc.filename or vault_file
            raise Exception(
                f"Cannot restore this file because it is still open: {locked_path}"
            ) from exc

        del index[filename]
        self._save_index(index)

    def set_category(self, filename: str, category: str):
        if not self.is_open:
            raise Exception("Vault not open")

        normalized = (category or "").strip() or "Uncategorized"
        index = self._load_index()
        if filename not in index:
            raise Exception("No metadata found for this file.")

        index[filename]["category"] = normalized
        self._save_index(index)

    def _load_index(self):
        primary_path = os.path.join(VAULT_PLAIN, INDEX_FILE)
        legacy_paths = [
            os.path.join(VAULT_PLAIN, LEGACY_INDEX_FILE),
            os.path.join(BASE_DIR, LEGACY_INDEX_FILE),
        ]

        raw_index = {}

        if os.path.exists(primary_path):
            with open(primary_path, "r") as f:
                raw_index = json.load(f)
        else:
            for legacy_path in legacy_paths:
                if os.path.exists(legacy_path):
                    with open(legacy_path, "r") as f:
                        raw_index = json.load(f)
                    break

        normalized_index = {}
        for filename, metadata in raw_index.items():
            if isinstance(metadata, str):
                normalized_index[filename] = {
                    "original_path": metadata,
                    "category": infer_category(filename),
                }
                continue

            if isinstance(metadata, dict):
                normalized_index[filename] = {
                    "original_path": metadata.get("original_path", ""),
                    "category": normalize_category(metadata.get("category"), filename),
                }

        if normalized_index and normalized_index != raw_index:
            self._save_index(normalized_index)

        return normalized_index

    def _save_index(self, index):
        path = os.path.join(VAULT_PLAIN, INDEX_FILE)
        with open(path, "w") as f: json.dump(index, f, indent=2)

    def _cleanup_temp_files(self):
        if os.path.exists(VAULT_ZIP):
            os.remove(VAULT_ZIP)
        try:
            self._clear_plain_vault()
        except PermissionError:
            pass

    def _clear_plain_vault(self):
        if not os.path.exists(VAULT_PLAIN):
            return

        for entry in os.listdir(VAULT_PLAIN):
            entry_path = os.path.join(VAULT_PLAIN, entry)
            try:
                if os.path.isdir(entry_path):
                    shutil.rmtree(entry_path, onerror=self._handle_remove_readonly)
                else:
                    self._make_writable(entry_path)
                    os.remove(entry_path)
            except PermissionError as exc:
                locked_path = exc.filename or entry_path
                raise Exception(
                    f"Cannot unlock vault because this file is still open: {locked_path}"
                ) from exc

    def _make_writable(self, path):
        if os.path.exists(path):
            os.chmod(path, stat.S_IWRITE | stat.S_IREAD)

    def _handle_remove_readonly(self, func, path, exc_info):
        self._make_writable(path)
        func(path)
