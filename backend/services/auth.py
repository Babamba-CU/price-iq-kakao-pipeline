from datetime import datetime, timedelta, timezone
from typing import Optional

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from database import get_db
from models.user import User
from schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

_redis: Optional[aioredis.Redis] = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, email: str, password: str) -> Optional[dict]:
        result = await self.db.execute(select(User).where(User.email == email, User.is_active == True))
        user = result.scalar_one_or_none()
        if not user or not _verify_password(password, user.hashed_password):
            return None

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()

        access_token = _create_token(
            {"sub": str(user.id), "role": user.role},
            timedelta(minutes=settings.jwt_access_token_expire_min),
        )
        refresh_token = _create_token(
            {"sub": str(user.id), "type": "refresh"},
            timedelta(days=settings.jwt_refresh_token_expire_days),
        )
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

    async def refresh(self, refresh_token: str) -> Optional[dict]:
        r = _get_redis()
        if await r.get(f"blacklist:{refresh_token}"):
            return None
        try:
            payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            if payload.get("type") != "refresh":
                return None
            user_id = int(payload["sub"])
        except JWTError:
            return None

        user = await self.db.get(User, user_id)
        if not user or not user.is_active:
            return None

        access_token = _create_token(
            {"sub": str(user.id), "role": user.role},
            timedelta(minutes=settings.jwt_access_token_expire_min),
        )
        new_refresh = _create_token(
            {"sub": str(user.id), "type": "refresh"},
            timedelta(days=settings.jwt_refresh_token_expire_days),
        )
        await r.setex(
            f"blacklist:{refresh_token}",
            int(timedelta(days=settings.jwt_refresh_token_expire_days).total_seconds()),
            "1",
        )
        return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

    async def logout(self, refresh_token: str) -> None:
        r = _get_redis()
        ttl = int(timedelta(days=settings.jwt_refresh_token_expire_days).total_seconds())
        await r.setex(f"blacklist:{refresh_token}", ttl, "1")

    async def create_user(self, data: UserCreate) -> User:
        user = User(
            username=data.username,
            email=data.email,
            hashed_password=_hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            org_type=data.org_type,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        token = credentials.credentials
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            user_id = int(payload["sub"])
        except (JWTError, KeyError):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다")

        user = await db.get(User, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다")
        return user


def require_role(*roles: str):
    async def dependency(
        current_user: User = Depends(AuthService.get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
        return current_user
    return dependency
