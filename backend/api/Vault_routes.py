from fastapi import APIRouter
from pydantic import BaseModel

from backend.vault.vault_service import (
    open_vault,
    close_vault,
    add_file,
    delete_file,
    list_files,
    restore_file
)

router = APIRouter()


class PasswordRequest(BaseModel):
    password: str


class FileRequest(BaseModel):
    path: str


class FilenameRequest(BaseModel):
    filename: str


@router.post("/open")
def open_vault_route(data: PasswordRequest):
    open_vault(data.password)
    return {"message": "Vault opened"}


@router.post("/close")
def close_vault_route(data: PasswordRequest):
    close_vault(data.password)
    return {"message": "Vault closed"}


@router.post("/add")
def add_file_route(data: FileRequest):
    add_file(data.path)
    return {"message": "File added to vault"}


@router.post("/delete")
def delete_file_route(data: FilenameRequest):
    delete_file(data.filename)
    return {"message": "File deleted"}


@router.get("/list")
def list_files_route():
    return {"files": list_files()}


@router.post("/restore")
def restore_file_route(data: FilenameRequest):
    restore_file(data.filename)
    return {"message": "File restored"}