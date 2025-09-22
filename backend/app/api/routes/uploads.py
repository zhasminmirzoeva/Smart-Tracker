# app/api/routes/uploads.py
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings

router = APIRouter()

ALLOWED_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

def _ensure_upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p

def _public_url(filename: str) -> str:
    # если задан PUBLIC_BASE_URL — отдать абсолютный URL, иначе относительный
    if settings.PUBLIC_BASE_URL:
        base = settings.PUBLIC_BASE_URL.rstrip("/")
        return f"{base}/uploads/{filename}"
    return f"/uploads/{filename}"

@router.post("/image", status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # MIME-проверка
    ct = (file.content_type or "").lower()
    ext = ALLOWED_MIME.get(ct)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Поддерживаются только изображения: jpeg, png, webp, heic/heif",
        )

    # Лимит размера
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    chunk = await file.read()  # читаем целиком (для простоты). Можно постранично, если ожидаются большие файлы.
    if len(chunk) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. Максимум {settings.MAX_UPLOAD_MB} МБ",
        )

    # Генерируем безопасное имя файла
    filename = f"{uuid.uuid4().hex}{ext}"
    out_dir = _ensure_upload_dir()
    out_path = out_dir / filename

    with open(out_path, "wb") as f:
        f.write(chunk)

    url = _public_url(filename)
    return {"url": url, "filename": filename, "content_type": ct}
