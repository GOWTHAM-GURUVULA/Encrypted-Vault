from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

if __package__ == "backend":
    from .vault.vault_fs import ContainerVault
else:
    from vault.vault_fs import ContainerVault

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vault = ContainerVault()

class PasswordBody(BaseModel):
    password: str

class RecoveryKeyBody(BaseModel):
    recovery_key: str

class SetPasswordBody(BaseModel):
    password: str

class CategoryBody(BaseModel):
    category: str

@app.post("/vault/open")
def open_vault(body: PasswordBody):
    try:
        vault.open_vault(body.password)
        return {"status": "opened"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/open/recovery")
def open_vault_with_recovery(body: RecoveryKeyBody):
    try:
        vault.open_with_recovery_key(body.recovery_key)
        return {"status": "opened"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/close")
def close_vault(body: PasswordBody):
    try:
        vault.close_vault(body.password)
        return {"status": "closed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/vault/recovery-status")
def recovery_status():
    return vault.recovery_status()

@app.post("/vault/recovery-key")
def create_recovery_key():
    try:
        return {"recovery_key": vault.generate_recovery_key()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/password")
def set_password(body: SetPasswordBody):
    try:
        vault.set_password(body.password)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/vault/files")
def list_files():
    return {"files": vault.list_files()}

@app.post("/vault/add")
def add_file(path: str = Form(...)):
    try:
        vault.add_file(path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/delete/{filename}")
def delete_file(filename: str):
    try:
        vault.delete_file(filename)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/restore/{filename}")
def restore_file(filename: str):
    try:
        vault.restore_file(filename)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/vault/category/{filename}")
def set_category(filename: str, body: CategoryBody):
    try:
        vault.set_category(filename, body.category)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("ENCRYPTED_VAULT_PORT", "8000")),
    )
