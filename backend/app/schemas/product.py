from datetime import date
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class ProductCreate(BaseModel):
    expiry_date: date
    name: Optional[str] = None
    category: Optional[str] = None
    photo_url: Optional[str] = None
    barcode: Optional[str] = None
    # обязательное поле (>=1)
    quantity: int = Field(..., ge=1)

    @field_validator("expiry_date")
    @classmethod
    def not_past(cls, v: date):
        from datetime import date as _date
        if v < _date.today():
            raise ValueError("Дата срока годности не может быть в прошлом")
        return v

class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    photo_url: str
    barcode: Optional[str] = None
    source: str
    expiry_date: date
    quantity: int
    net_quantity: Optional[str] = None

    class Config:
        from_attributes = True

class ProductDraftOut(BaseModel):
    # Ответ lookup по штрих-коду (для префила формы)
    name: str
    category: str
    photo_url: Optional[str] = None
    barcode: Optional[str] = None
    source: str = "openfoodfacts"
    quantity: Optional[int] = None
    net_quantity: Optional[str] = None

# PATCH /quantity: разрешаем 0 (семантика «удалить»), запрещаем отрицательные
class QuantityUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

# POST /consume: только положительные списания
class ConsumeIn(BaseModel):
    amount: int = Field(..., ge=1)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    photo_url: Optional[str] = None
    expiry_date: Optional[date] = None
    # В PUT не разрешаем 0 (удаление делаем только через PATCH /quantity или DELETE)
    quantity: Optional[int] = Field(None, ge=1)

    @field_validator("expiry_date")
    @classmethod
    def not_past(cls, v: date):
        if v and v < date.today():
            raise ValueError("Дата срока годности не может быть в прошлом")
        return v
