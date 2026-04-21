"""초기 관리자 계정 생성 스크립트."""
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from config import settings
from database import AsyncSessionLocal, engine, Base
from models import User
from services.auth import _hash_password


async def create_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == settings.initial_admin_email))
        if result.scalar_one_or_none():
            print(f"[=] 관리자 계정이 이미 존재합니다: {settings.initial_admin_email}")
            return

        admin = User(
            username="admin",
            email=settings.initial_admin_email,
            hashed_password=_hash_password(settings.initial_admin_password),
            full_name="시스템 관리자",
            role="admin",
            org_type="PNF",
        )
        db.add(admin)
        await db.commit()
        print(f"[+] 관리자 계정 생성 완료: {settings.initial_admin_email}")
        print("    ⚠️  배포 후 즉시 비밀번호를 변경하세요!")


if __name__ == "__main__":
    asyncio.run(create_admin())
