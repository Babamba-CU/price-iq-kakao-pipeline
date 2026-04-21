"""단말 마스터 초기 데이터 적재 스크립트."""
import asyncio
import json
from datetime import date
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from database import AsyncSessionLocal
from models.device_meta import DeviceMeta, DeviceSubsidy


async def seed():
    master_path = Path(__file__).parent.parent / "data" / "device_master.json"
    devices = json.loads(master_path.read_text(encoding="utf-8"))

    async with AsyncSessionLocal() as db:
        for item in devices:
            existing = await db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(DeviceMeta).where(DeviceMeta.device_name == item["device_name"])
            )
            device = existing.scalar_one_or_none()

            if not device:
                release_date = None
                if item.get("release_date"):
                    release_date = date.fromisoformat(item["release_date"])

                device = DeviceMeta(
                    device_name=item["device_name"],
                    aliases=item.get("aliases", []),
                    release_price=item["release_price"],
                    release_date=release_date,
                    is_active=item.get("is_active", True),
                )
                db.add(device)
                await db.flush()
                print(f"[+] 단말 등록: {device.device_name}")
            else:
                print(f"[=] 단말 이미 존재: {device.device_name}")

            for carrier, subsidy_amount in item.get("official_subsidy_by_carrier", {}).items():
                from sqlalchemy import select
                sub_result = await db.execute(
                    select(DeviceSubsidy).where(
                        DeviceSubsidy.device_id == device.id,
                        DeviceSubsidy.carrier == carrier,
                        DeviceSubsidy.effective_to.is_(None),
                    )
                )
                sub = sub_result.scalar_one_or_none()
                if not sub:
                    db.add(DeviceSubsidy(
                        device_id=device.id,
                        carrier=carrier,
                        subsidy=subsidy_amount,
                        effective_from=date.today(),
                    ))
                    print(f"    [+] 공시지원금: {carrier} = {subsidy_amount:,}원")

        await db.commit()
    print("\n완료!")


if __name__ == "__main__":
    asyncio.run(seed())
