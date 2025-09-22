# app/utils/ai_recipes.py
import json
from typing import Any
from openai import OpenAI
from app.core.config import settings

JSON_SYSTEM_PROMPT = """Ты — помощник по кулинарии. Формируй ответ строго в JSON.
Приоритизируй использование продуктов с ближайшей датой истечения (меньшее 'days_to_expiry' важнее).
Если окно пусто — выбирай ближайшие по срокам в целом. Учитывай количество (quantity).
Никакого текста вне JSON.
Структура:
{
  "title": "string",
  "servings": number,
  "ingredients": [
    {"name":"string","quantity":"string","source_product_id": number | null}
  ],
  "steps": ["string", "..."],
  "estimated_time_min": number,
  "notes": "string"
}
"""

def build_user_prompt(products: list[dict], servings: int, notes: str | None) -> list[dict]:
    # products: [{id, name, category, quantity, net_quantity, expiry_date, days_to_expiry, priority}]
    return [
        {"role": "system", "content": JSON_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps({
                "servings": servings,
                "notes": notes,
                "products": products
            }, ensure_ascii=False)
        }
    ]

def generate_recipe(products: list[dict], servings: int = 2, notes: str | None = None) -> dict:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY не задан в .env")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = build_user_prompt(products, servings, notes)

    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=messages,
        #temperature=0.7,
    )
    return json.loads(resp.choices[0].message.content)
