from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from models import (
    BackupEntry,
    BackupResponse,
    ExportResponse,
    ImportRequest,
    OkResponse,
    RestoreRequest,
    UploadResponse,
)

router = APIRouter(tags=["data"])


# ── Export ─────────────────────────────────────────────────────────────────────


@router.post("/plays/{play_id}/export", response_model=ExportResponse)
def export_play(play_id: str, request: Request) -> ExportResponse:
    storage = request.app.state.storage
    play = storage.load_play(play_id)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    name, path = storage.create_export(play)
    return ExportResponse(name=name, path=str(path))


@router.get("/plays/{play_id}/export/{filename}")
def download_export(play_id: str, filename: str, request: Request) -> FileResponse:
    storage = request.app.state.storage
    path = storage.export_path(filename)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Export file '{filename}' not found.")
    return FileResponse(path=str(path), filename=filename, media_type="application/json")


# ── Import ─────────────────────────────────────────────────────────────────────


@router.post("/plays/import/upload", response_model=UploadResponse)
async def upload_import(file: UploadFile, request: Request) -> UploadResponse:
    storage = request.app.state.storage
    data = await file.read()
    try:
        json.loads(data)  # Validate it's valid JSON before staging
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded file is not valid JSON.")
    name = storage.stage_import(file.filename or "import.json", data)
    return UploadResponse(name=name)


@router.post("/plays/{play_id}/import", response_model=OkResponse)
def apply_import(play_id: str, body: ImportRequest, request: Request) -> OkResponse:
    storage = request.app.state.storage
    play = storage.load_staged_import(body.name)
    if play is None:
        raise HTTPException(status_code=400, detail=f"Staged import '{body.name}' not found.")
    # URL id is authoritative — override the play's id field
    play = play.model_copy(update={"id": play_id})
    storage.save_play(play)
    return OkResponse()


# ── Backup ─────────────────────────────────────────────────────────────────────


@router.get("/plays/{play_id}/backups", response_model=list[BackupEntry])
def list_backups(play_id: str, request: Request) -> list[BackupEntry]:
    storage = request.app.state.storage
    if storage.load_play(play_id) is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    return storage.list_backups(play_id)


@router.post("/plays/{play_id}/backup", response_model=BackupResponse)
def backup_play(play_id: str, request: Request) -> BackupResponse:
    storage = request.app.state.storage
    play = storage.load_play(play_id)
    if play is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    entry = storage.create_backup(play)
    return BackupResponse(path=entry.path)


@router.post("/plays/{play_id}/restore", response_model=OkResponse)
def restore_play(play_id: str, body: RestoreRequest, request: Request) -> OkResponse:
    storage = request.app.state.storage
    if storage.load_play(play_id) is None:
        raise HTTPException(status_code=404, detail=f"Play '{play_id}' not found.")
    play = storage.load_backup(play_id, body.name)
    if play is None:
        raise HTTPException(status_code=400, detail=f"Backup '{body.name}' not found.")
    play = play.model_copy(update={"id": play_id})
    storage.save_play(play)
    return OkResponse()
