from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
)
from app.db.models import User, RefreshToken
from app.schemas.auth import RegisterIn, LoginIn, TokenPair, RefreshIn, LogoutIn
from app.schemas.user import UserOut
from app.utils.validators import validate_password_policy

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    validate_password_policy(data.password)

    # Проверка email на уникальность
    existing = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email уже зарегистрирован")

    user = User(email=data.email, hashed_password=get_password_hash(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверная почта или пароль")

    access = create_access_token(user.id)

    # Создаем refresh + записываем его jti в БД
    refresh, jti = create_refresh_token(user.id)
    rt = RefreshToken(
        jti=jti,
        user_id=user.id,
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(rt)
    db.commit()

    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh_tokens(data: RefreshIn, db: Session = Depends(get_db)):
    try:
        payload = decode_refresh_token(data.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный или просроченный refresh токен")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный тип токена")

    user_id = int(payload.get("sub", 0))
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")

    # Проверяем запись о refresh в БД
    rt = db.execute(select(RefreshToken).where(RefreshToken.jti == jti)).scalar_one_or_none()
    if not rt or rt.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh токен отозван или не найден")

    if rt.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh токен просрочен")

    # Ротация: помечаем старый как отозванный и выпускаем новый
    rt.revoked = True

    new_access = create_access_token(user_id)
    new_refresh, new_jti = create_refresh_token(user_id)

    new_rt = RefreshToken(
        jti=new_jti,
        user_id=user_id,
        revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(new_rt)
    db.commit()

    return TokenPair(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", status_code=204)
def logout(data: LogoutIn, db: Session = Depends(get_db)):
    # Отзываем конкретный refresh токен (например, при выходе с устройства)
    try:
        payload = decode_refresh_token(data.refresh_token)
    except Exception:
        # Мягкий ответ: если невалиден — ничего не делаем
        return

    jti = payload.get("jti")
    if not jti:
        return

    rt = db.execute(select(RefreshToken).where(RefreshToken.jti == jti)).scalar_one_or_none()
    if rt and not rt.revoked:
        rt.revoked = True
        db.commit()
    return


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user