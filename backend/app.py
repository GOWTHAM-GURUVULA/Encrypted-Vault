from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vault.vault_fs import ContainerVault

app = FastAPI()
vault = ContainerVault()

# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MODELS ----------------

class PasswordBody(BaseModel):
    password: str

# ---------------- ROOT ----------------

@app.get("/")
def root():
    return {"status": "Backend running"}

# ---------------- VAULT CORE ----------------

@app.get("/vault/status")
def vault_status():
    return {"open": vault.is_open}


@app.post("/vault/init")
def init_vault(body: PasswordBody):
    vault.open_vault(body.password)
    return {"success": True}


@app.post("/vault/open")
def open_vault(body: PasswordBody):
    vault.open_vault(body.password)
    return {"success": True}

# ---------------- FILE APIs ----------------

@app.get("/vault/files")
def list_files():
    return {"files": vault.list_files()}


@app.post("/vault/add")
def add_file(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(file.file.read())

    vault.add_file(temp_path)
    return {"success": True}


@app.post("/vault/delete/{file_id}")
def delete_file(file_id: str):
    vault.delete_file(file_id)
    return {"success": True}


@app.post("/vault/restore/{file_id}")
def restore_file(file_id: str):
    vault.restore_file(file_id)
    return {"success": True}
