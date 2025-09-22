import re
from fastapi import HTTPException, status

PASSWORD_REGEX = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")

# проверка пароля на 8 символов и тд
def validate_password_policy(password: str) -> None:
    if not PASSWORD_REGEX.match(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Пароль должен быть не короче 8 символов и содержать минимум одну заглавную букву и цифру",
        )