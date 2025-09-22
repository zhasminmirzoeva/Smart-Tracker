from fastapi import APIRouter, Depends, HTTPException, Query, Path, Response
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from typing import List, Optional

from app.api.deps import get_db, get_current_user
from app.db.models import Product, User, DEFAULT_PHOTO
from app.schemas.product import (
    ProductCreate, ProductOut, ProductDraftOut, QuantityUpdate, ConsumeIn, ProductUpdate
)
from app.utils.openfoodfacts import OFFClient

router = APIRouter()
off_client = OFFClient()

#LOOKUP: префил по штрих-коду
@router.get("/lookup", response_model=ProductDraftOut)
async def lookup_by_barcode(
    barcode: str = Query(..., min_length=6, max_length=64),
    current_user: User = Depends(get_current_user),
):
    product = await off_client.fetch_by_barcode(barcode)
    if not product:
        raise HTTPException(status_code=404, detail="Товар по штрих-коду не найден в OpenFoodFacts")
    fields = OFFClient.to_fields(product)
    return ProductDraftOut(
        name=fields.get("name") or "Без названия",
        category=fields.get("category") or "другое",
        photo_url=fields.get("photo_url"),
        barcode=barcode,
        source="openfoodfacts",
        quantity=fields.get("quantity"),
        net_quantity=fields.get("net_quantity"),
    )

#LIST
@router.get("/", response_model=List[ProductOut])
@router.get("", response_model=List[ProductOut], include_in_schema=False)
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    q: Optional[str] = Query(None, description="Поиск по названию"),
):
    stmt = select(Product).where(Product.user_id == current_user.id).order_by(Product.expiry_date.asc())
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q}%"))
    return db.execute(stmt).scalars().all()

#CREATE
@router.post("/", response_model=ProductOut, status_code=201)
@router.post("", response_model=ProductOut, status_code=201, include_in_schema=False)
async def add_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # quantity обязателен (ge=1), expiry_date валидируется схемой

    name = payload.name
    category = payload.category or "другое"
    photo_url = payload.photo_url or DEFAULT_PHOTO
    source = "manual"
    quantity = payload.quantity  # уже гарантирован >=1
    net_q: Optional[str] = None

    # Дубликат по штрих-коду
    if payload.barcode:
        existing = db.execute(
            select(Product).where(and_(Product.user_id == current_user.id, Product.barcode == payload.barcode))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Продукт с таким штрих-кодом уже есть. Вы можете изменить его количество.",
                    "existing_product": {
                        "id": existing.id,
                        "name": existing.name,
                        "quantity": existing.quantity,
                        "expiry_date": str(existing.expiry_date),
                    },
                },
            )

    # Подтягиваем OFF (метаданные; количество автоматически НЕ подставляем)
    if payload.barcode:
        product = await off_client.fetch_by_barcode(payload.barcode)
        if product:
            fields = OFFClient.to_fields(product)
            name = fields.get("name") or name
            category = fields.get("category") or category
            photo_url = fields.get("photo_url") or photo_url
            net_q = fields.get("net_quantity")
            source = "openfoodfacts"
        else:
            if not name:
                raise HTTPException(
                    status_code=404,
                    detail="Товар по штрих-коду не найден в OpenFoodFacts. Введите название и категорию вручную.",
                )

    if not name:
        raise HTTPException(status_code=422, detail="Название обязательно")

    obj = Product(
        user_id=current_user.id,
        name=name,
        category=category,
        photo_url=photo_url,
        barcode=payload.barcode,
        source=source,
        expiry_date=payload.expiry_date,
        quantity=quantity,
        net_quantity=net_q,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# PATCH /quantity: 0 => delete (204), >0 => установить
@router.patch("/{product_id}/quantity",
              response_model=Optional[ProductOut],
              responses={204: {"description": "Deleted"}})
def set_quantity(
    product_id: int = Path(..., ge=1),
    data: QuantityUpdate = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.get(Product, product_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Продукт не найден")

    if data is None or data.quantity is None:
        raise HTTPException(status_code=422, detail="Количество обязательно для заполнения")

    if data.quantity <= 0:
        db.delete(obj)
        db.commit()
        return Response(status_code=204)

    obj.quantity = data.quantity
    db.commit()
    db.refresh(obj)
    return obj

#POST /consume
@router.post("/{product_id}/consume",
             response_model=Optional[ProductOut],
             responses={204: {"description": "Deleted"}})
def consume(
    product_id: int = Path(..., ge=1),
    data: ConsumeIn = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.get(Product, product_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    if data is None or data.amount is None:
        raise HTTPException(status_code=422, detail="Количество обязательно для заполнения")
    if data.amount <= 0:
        raise HTTPException(status_code=422, detail="Количество не может быть отрицательным")
    if data.amount > obj.quantity:
        raise HTTPException(status_code=422, detail="Нельзя списать больше, чем есть в наличии")

    obj.quantity -= data.amount
    if obj.quantity <= 0:
        db.delete(obj)
        db.commit()
        return Response(status_code=204)

    db.commit()
    db.refresh(obj)
    return obj

#DELETE
@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.get(Product, product_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Продукт не найден")

    db.delete(obj)
    db.commit()
    return

#PUT
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.get(Product, product_id)
    if not obj or obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Продукт не найден")

    if data.name is not None:
        obj.name = data.name
    if data.category is not None:
        obj.category = data.category
    if data.photo_url is not None:
        obj.photo_url = data.photo_url
    if data.expiry_date is not None:
        obj.expiry_date = data.expiry_date
    if data.quantity is not None:
        if data.quantity <= 0:
            raise HTTPException(status_code=422, detail="Количество продукта должно быть положительным")
        obj.quantity = data.quantity

    db.commit()
    db.refresh(obj)
    return obj
