"""행정안전부 법정동 코드 기반 지역 마스터 초기 적재 스크립트."""
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from database import AsyncSessionLocal
from models.region import Region

SIDO_LIST = [
    ("1100000000", "서울특별시"),
    ("2600000000", "부산광역시"),
    ("2700000000", "대구광역시"),
    ("2800000000", "인천광역시"),
    ("2900000000", "광주광역시"),
    ("3000000000", "대전광역시"),
    ("3100000000", "울산광역시"),
    ("3600000000", "세종특별자치시"),
    ("4100000000", "경기도"),
    ("4200000000", "강원특별자치도"),
    ("4300000000", "충청북도"),
    ("4400000000", "충청남도"),
    ("4500000000", "전북특별자치도"),
    ("4600000000", "전라남도"),
    ("4700000000", "경상북도"),
    ("4800000000", "경상남도"),
    ("5000000000", "제주특별자치도"),
]


async def seed():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        for code, name in SIDO_LIST:
            result = await db.execute(select(Region).where(Region.code == code))
            if not result.scalar_one_or_none():
                db.add(Region(code=code, name=name, level="sido"))
                print(f"[+] 시도 등록: {name}")
            else:
                print(f"[=] 이미 존재: {name}")
        await db.commit()
    print("\n시도 데이터 적재 완료. 시군구/동 데이터는 행안부 공식 파일을 파싱하여 추가하세요.")


if __name__ == "__main__":
    asyncio.run(seed())
