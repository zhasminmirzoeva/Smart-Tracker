# app/schemas/recipe.py
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field

class RecipeGenerateIn(BaseModel):
    servings: int = Field(2, ge=1, le=12)
    notes: Optional[str] = Field(None, description="Пожелания: без глютена, ПП, быстро и т.п.")
    # можно передать список product_id, если хочешь сгенерировать не из всех
    product_ids: Optional[list[int]] = None
    # приоритезация по срокам
    prefer_expiring_first: bool = True
    expiring_within_days: int = Field(10, ge=1, le=60, description="Окно, в которое считаем 'на исходе'")
class RecipeOut(BaseModel):
    id: int
    title: str
    content: dict
    used_product_ids: Optional[list[int]] = None
    created_at: datetime

    class Config:
        from_attributes = True
