import os
import shutil
import zipfile
import json
import uuid
from security import crypto_core

VAULT_ENC = "vault.enc"
VAULT_PLAIN = "vault_plain"
VAULT_ZIP = "vault.zip"
INDEX_FILE = ".vault_index.json"


class ContainerVault:
    def __init__(self):
        self.is_open = os.path.exists(VAULT_PLAIN)

    # ---------- VAULT OPEN ----------

    def open_vault(self, password: str):
        if self.is_open:
            return

        os.makedirs(VAULT_PLAIN, exist_ok=True)

        if not os.path.exists(VAULT_ENC):
            self.is_open = True
            return

        with open(VAULT_ENC, "rb") as f:
            encrypted = f.read()

        decrypted = crypto_core.decrypt(encrypted, password)

        with open(VAULT_ZIP, "wb") as f:
            f.write(decrypted)

        with zipfile.ZipFile(VAULT_ZIP, "r") as zipf:
            zipf.extractall(VAULT_PLAIN)

        os.remove(VAULT_ZIP)
        os.remove(VAULT_ENC)

        self.is_open = True

    # ---------- INTERNAL ----------

    def _ensure_open(self):
        if not self.is_open and os.path.exists(VAULT_PLAIN):
            self.is_open = True
        if not self.is_open:
            raise Exception("Vault is not open")

    def _load_index(self):
        index_path = os.path.join(VAULT_PLAIN, INDEX_FILE)
        if not os.path.exists(index_path):
            return {}
        with open(index_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_index(self, index):
        index_path = os.path.join(VAULT_PLAIN, INDEX_FILE)
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)

    # ---------- FILE OPS ----------

    def add_file(self, real_path: str):
        self._ensure_open()

        file_id = str(uuid.uuid4())
        vault_name = f"{file_id}.bin"
        vault_path = os.path.join(VAULT_PLAIN, vault_name)

        shutil.move(real_path, vault_path)

        index = self._load_index()
        index[file_id] = {
            "original_name": os.path.basename(real_path),
            "original_path": real_path,
            "vault_name": vault_name,
        }
        self._save_index(index)

    def list_files(self):
        self._ensure_open()
        index = self._load_index()
        return [{"id": fid, "name": meta["original_name"]} for fid, meta in index.items()]

    def restore_file(self, file_id: str):
        self._ensure_open()

        index = self._load_index()
        if file_id not in index:
            raise Exception("File not found")

        meta = index[file_id]
        vault_path = os.path.join(VAULT_PLAIN, meta["vault_name"])
        original_path = meta["original_path"]

        dir_path = os.path.dirname(original_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        shutil.move(vault_path, original_path)

        del index[file_id]
        self._save_index(index)

    def delete_file(self, file_id: str):
        self._ensure_open()

        index = self._load_index()
        if file_id in index:
            vault_path = os.path.join(VAULT_PLAIN, index[file_id]["vault_name"])
            if os.path.exists(vault_path):
                os.remove(vault_path)
            del index[file_id]
            self._save_index(index)
