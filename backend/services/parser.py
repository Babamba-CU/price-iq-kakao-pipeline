import base64
import json
import logging
from typing import Optional

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models.price_entry import PriceEntry
from models.device_meta import DeviceMeta

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """당신은 이동통신 도매 단가 데이터를 구조화하는 파서입니다.
입력된 텍스트에서 다음 필드를 추출하여 JSON 배열로만 응답하세요.
필드가 명시되지 않은 경우 null로 처리합니다.

추출 필드:
- carrier: SKT | KT | LGU
- device_name: 단말명
- sub_type: 010 | MNP | 기변
- support_type: 선약 | 공시
- plan_condition: 요금제 조건 문자열
- region_sido: 시/도
- region_sigungu: 시군구
- region_dong: 읍면동
- store_type: unknown | code | pnf
- store_code: 판매점 코드
- policy_start_at: ISO8601 형식
- price: 정수 (원 단위, 10만=100000, 100K=100000)

반드시 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요."""


class ParserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def parse_text(self, raw_text: str, submitted_by: Optional[int] = None) -> list[PriceEntry]:
        parsed = await self._call_claude_text(raw_text)
        entries = []
        for item in parsed:
            entry = await self._build_entry(item, source_type="text", raw_content=raw_text, submitted_by=submitted_by)
            self.db.add(entry)
            entries.append(entry)
        await self.db.commit()
        for e in entries:
            await self.db.refresh(e)
        return entries

    async def parse_image(self, image_bytes: bytes, submitted_by: Optional[int] = None) -> list[PriceEntry]:
        parsed = await self._call_claude_image(image_bytes)
        entries = []
        for item in parsed:
            entry = await self._build_entry(item, source_type="image", submitted_by=submitted_by)
            self.db.add(entry)
            entries.append(entry)
        await self.db.commit()
        for e in entries:
            await self.db.refresh(e)
        return entries

    async def _call_claude_text(self, text: str) -> list[dict]:
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": text}],
            )
            return json.loads(response.content[0].text)
        except Exception as e:
            logger.error(f"텍스트 파싱 실패: {e}")
            return []

    async def _call_claude_image(self, image_bytes: bytes) -> list[dict]:
        try:
            b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
                            },
                            {"type": "text", "text": "이 이미지에서 도매 단가 정보를 추출해주세요."},
                        ],
                    }
                ],
            )
            return json.loads(response.content[0].text)
        except Exception as e:
            logger.error(f"이미지 파싱 실패: {e}")
            return []

    async def _build_entry(self, item: dict, source_type: str, raw_content: str = None, submitted_by: Optional[int] = None) -> PriceEntry:
        from datetime import datetime, timezone

        device_id = None
        is_valid = True

        if item.get("device_name"):
            device_id = await self._match_device(item["device_name"])
            if device_id is None:
                is_valid = False

        price = item.get("price")
        if not price or not item.get("carrier") or not item.get("sub_type") or not item.get("support_type"):
            is_valid = False

        return PriceEntry(
            source_type=source_type,
            raw_content=raw_content,
            parsed_at=datetime.now(timezone.utc),
            carrier=item.get("carrier", ""),
            device_id=device_id,
            device_name=item.get("device_name"),
            sub_type=item.get("sub_type", ""),
            support_type=item.get("support_type", ""),
            plan_condition=item.get("plan_condition"),
            region_sido=item.get("region_sido"),
            region_sigungu=item.get("region_sigungu"),
            region_dong=item.get("region_dong"),
            store_type=item.get("store_type"),
            store_code=item.get("store_code"),
            policy_start_at=item.get("policy_start_at"),
            price=price or 0,
            is_valid=is_valid,
            submitted_by=submitted_by,
        )

    async def _match_device(self, device_name: str) -> Optional[int]:
        result = await self.db.execute(select(DeviceMeta).where(DeviceMeta.is_active == True))
        devices = result.scalars().all()
        name_lower = device_name.lower().replace(" ", "")
        for device in devices:
            if device.device_name.lower().replace(" ", "") == name_lower:
                return device.id
            aliases = device.aliases or []
            for alias in aliases:
                if alias.lower().replace(" ", "") == name_lower:
                    return device.id
        return None
