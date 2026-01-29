from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/vault", tags=["Vault"])

# -------------------------
# In-memory vault state
# -------------------------
VAULT_PASSWORD = None
vault_open = False


class PasswordRequest(BaseModel):
    password: str


@router.post("/init")
def init_vault(data: PasswordRequest):
    global VAULT_PASSWORD, vault_open

    VAULT_PASSWORD = data.password
    vault_open = False

    return {"message": "Vault password set successfully"}


@router.post("/open")
def open_vault(data: PasswordRequest):
    global vault_open

    if VAULT_PASSWORD is None:
        raise HTTPException(status_code=400, detail="Vault not initialized")

    if data.password != VAULT_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    vault_open = True
    return {"message": "Vault opened"}


@router.get("/status")
def vault_status():
    return {"open": vault_open}
