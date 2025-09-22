# app/api/routes/recipes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from datetime import date as _date

from app.api.deps import get_db, get_current_user
from app.db.models import Product, Recipe, User
from app.schemas.recipe import RecipeGenerateIn, RecipeOut
from app.utils.ai_recipes import generate_recipe

router = APIRouter()

def _serialize_product(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "quantity": getattr(p, "quantity", 1),
        "net_quantity": getattr(p, "net_quantity", None),
        "expiry_date": str(p.expiry_date),
        "barcode": p.barcode,
    }

@router.post("/generate", response_model=RecipeOut, status_code=201)
def generate_and_save(
    payload: RecipeGenerateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1) берём продукты пользователя (опционально — выбранные)
    stmt = select(Product).where(Product.user_id == current_user.id)
    if payload.product_ids:
        stmt = stmt.filter(Product.id.in_(payload.product_ids))
    products = db.execute(stmt).scalars().all()
    if not products:
        raise HTTPException(status_code=400, detail="Нет доступных продуктов для генерации")

    # исключаем нулевое количество и просроченные
    today = _date.today()
    candidates = [p for p in products if getattr(p, "quantity", 1) > 0 and p.expiry_date >= today]
    if not candidates:
        raise HTTPException(status_code=400, detail="Нет товаров с валидными датами и количеством > 0")

    # 2) считаем days_to_expiry
    enriched = []
    for p in candidates:
        days = (p.expiry_date - today).days
        enriched.append((days, p))

    # 3) если включена приоритезация — делим по окну, сортируем
    if payload.prefer_expiring_first:
        window = payload.expiring_within_days
        near = [p for days, p in enriched if days <= window]
        far  = [p for days, p in enriched if days >  window]

        near.sort(key=lambda x: (_date.fromisoformat(str(x.expiry_date)) - today).days)
        far.sort(key=lambda x: (_date.fromisoformat(str(x.expiry_date)) - today).days)

        ordered = near + far
    else:
        ordered = [p for _, p in sorted(enriched, key=lambda t: t[0])]

    # 4) сериализуем + добавим days_to_expiry/priority (для модели)
    prod_payload = []
    for p in ordered:
        d = _serialize_product(p)
        d["days_to_expiry"] = (p.expiry_date - today).days
        # priority: чем меньше дней — тем выше приоритет (меньше число → больше приоритет)
        d["priority"] = d["days_to_expiry"]
        prod_payload.append(d)
    prod_payload = prod_payload[:15]

    # 5) генерируем JSON-рецепт
    content = generate_recipe(prod_payload, servings=payload.servings, notes=payload.notes)
    title = (content.get("title") or "Рецепт")[:255]
    used_ids = [p["id"] for p in prod_payload]

    rec = Recipe(
        user_id=current_user.id,
        title=title,
        content=content,
        used_product_ids=used_ids,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
