# app/utils/openfoodfacts.py
import httpx
from typing import Optional
import re

class OFFClient:
    BASE = "https://world.openfoodfacts.org/api/v2/product/"
    LANG = "ru"  # язык интерфейса OFF (используется для локализации ответов)

    async def fetch_by_barcode(self, barcode: str) -> Optional[dict]:
        url = f"{self.BASE}{barcode}.json"
        timeout = httpx.Timeout(10.0)
        params = {"lc": self.LANG}  # ключ к локализации категорий и др. полей
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not data or data.get("status") != 1:
                return None
            return data.get("product", {})

    @staticmethod
    def _parse_quantity_to_int(q: Optional[str]) -> Optional[int]:
        if not q or not isinstance(q, str):
            return None
        nums = re.findall(r"\d+", q)
        if not nums:
            return None
        try:
            n = int(nums[0])
            return n if n > 0 else None
        except Exception:
            return None

    @staticmethod
    def _pick_category_ru(product: dict) -> str:
        """
        Пытаемся взять локализованную категорию:
        1) из 'categories' (OFF вернёт на языке lc, например ru)
        2) иначе — из tags (берём последний уровень и удаляем префикс 'xx:')
        """
        # 1) Человечный список категорий, локализованный OFF, например: "Закуски, Сладкие закуски, Шоколад"
        cats_str = product.get("categories")
        if isinstance(cats_str, str) and cats_str.strip():
            # Берём самый специфичный, последний элемент
            parts = [p.strip() for p in cats_str.split(",") if p.strip()]
            if parts:
                return parts[-1]

        # 2) Фоллбэк по тегам (могут быть 'en:beverages', 'fr:sodas' и т.п.)
        tags = product.get("categories_tags") or []
        if isinstance(tags, list) and tags:
            tag = tags[-1]  # берём самый специфичный
            if isinstance(tag, str):
                # срежем языковой префикс "xx:"
                return tag.split(":", 1)[-1]
        return "другое"

    @staticmethod
    def to_fields(product: dict) -> dict:
        name = product.get("product_name") or product.get("generic_name") or "Без названия"
        category = OFFClient._pick_category_ru(product)

        image = (
            product.get("image_url")
            or product.get("image_front_url")
            or product.get("selected_images", {}).get("front", {}).get("display", {}).get("en")
        )

        net_q = product.get("quantity")                # строка из OFF, напр. "500 g"
        qty_guess = OFFClient._parse_quantity_to_int(net_q)

        return {
            "name": name.strip() if isinstance(name, str) else "Без названия",
            "category": category if isinstance(category, str) and category else "другое",
            "photo_url": image or None,
            "net_quantity": net_q,   # показываем как есть
            "quantity": qty_guess,   # если смогли угадать
        }
