# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.base import Base, engine
from app.api.routes.auth import router as auth_router
from app.api.routes.products import router as products_router
from app.api.routes.recipes import router as recipes_router  # если есть
from app.api.routes.devices import router as devices_router   # если есть
from app.api.routes.users import router as users_router       # если есть
from app.api.routes.uploads import router as uploads_router   # <-- НОВОЕ

def create_app() -> FastAPI:
    application = FastAPI(title="Expiry Tracker API", version="0.5.0")

    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Маршруты
    application.include_router(auth_router,     prefix="/auth",    tags=["auth"])
    application.include_router(products_router, prefix="/products", tags=["products"])
    try:
        application.include_router(recipes_router,  prefix="/recipes",  tags=["recipes"])
    except Exception:
        pass
    try:
        application.include_router(devices_router,  prefix="/devices",  tags=["devices"])
        application.include_router(users_router,    prefix="/users",    tags=["users"])
    except Exception:
        pass
    application.include_router(uploads_router,  prefix="/uploads",  tags=["uploads"])  # <-- НОВОЕ

    @application.on_event("startup")
    def on_startup():
        # Каталог для загрузок
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        # Автосоздание таблиц (в проде — Alembic)
        Base.metadata.create_all(bind=engine)

    # Раздача статики /uploads/*
    application.mount(
        "/uploads",
        StaticFiles(directory=settings.UPLOAD_DIR),
        name="uploads",
        check_dir=False
    )

    return application

app = create_app()
