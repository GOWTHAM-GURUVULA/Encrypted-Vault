import os
import json
import hashlib
from fastapi import HTTPException

VAULT_META = "storage/vault_meta.json"
_vault_open = False


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def vault_exists() -> bool:
    return os.path.exists(VAULT_META)


def set_vault_password(password: str):
    if vault_exists():
        raise HTTPException(400, "Vault already initialized")

    os.makedirs("storage", exist_ok=True)

    with open(VAULT_META, "w") as f:
        json.dump(
            {"password_hash": _hash_password(password)},
            f
        )


def open_vault(password: str):
    global _vault_open

    if not vault_exists():
        raise HTTPException(400, "Vault not initialized")

    with open(VAULT_META, "r") as f:
        data = json.load(f)

    if _hash_password(password) != data["password_hash"]:
        raise HTTPException(401, "Invalid password")

    _vault_open = True


def close_vault():
    global _vault_open
    _vault_open = False


def is_vault_open():
    return _vault_open


def ensure_open():
    if not _vault_open:
        raise HTTPException(403, "Vault closed")
