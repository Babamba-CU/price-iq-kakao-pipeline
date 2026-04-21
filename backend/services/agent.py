import json
import logging
from datetime import date
from typing import Optional

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models.price_aggregated import PriceAggregated
from models.device_meta import DeviceMeta, DeviceSubsidy

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """당신은 이동통신 도매 단가 경쟁 분석 전문가입니다.
주어진 집계 데이터를 기반으로 다음 항목을 분석하고 마크다운 형식으로 리포트를 작성하세요:

1. **전체 우위/열위**: 3사(SKT/KT/LGU) 전국 평균단가 비교 및 포지션
2. **단말별 분석**: 주요 단말 기준 3사 비교 (상위 5개 단말)
3. **지역별 분석**: 시도 단위 우세/열세 지역
4. **변동 분석**: 직전 차수 대비 급등 캐리어/단말/지역
5. **대응 권고**: 열위 단말 및 지역에 대한 단가 조정 시사점

간결하고 실무적인 언어로 작성하세요."""


class AgentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._reports: list[dict] = []

    async def analyze(self, agg_round: Optional[int] = None) -> dict:
        context = await self._build_context(agg_round)
        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                system=ANALYSIS_PROMPT,
                messages=[{"role": "user", "content": json.dumps(context, ensure_ascii=False, default=str)}],
            )
            report_text = response.content[0].text
        except Exception as e:
            logger.error(f"에이전트 분석 실패: {e}")
            report_text = f"분석 중 오류가 발생했습니다: {e}"

        report = {
            "id": len(self._reports) + 1,
            "agg_date": context.get("agg_date"),
            "agg_round": context.get("agg_round"),
            "report": report_text,
        }
        self._reports.append(report)
        return report

    async def list_reports(self) -> list[dict]:
        return list(reversed(self._reports))

    async def get_report(self, report_id: int) -> Optional[dict]:
        return next((r for r in self._reports if r["id"] == report_id), None)

    async def _build_context(self, agg_round: Optional[int]) -> dict:
        stmt = (
            select(PriceAggregated)
            .where(PriceAggregated.agg_level == "national")
            .order_by(PriceAggregated.agg_date.desc(), PriceAggregated.agg_round.desc())
            .limit(200)
        )
        result = await db.execute(stmt) if False else await self.db.execute(stmt)
        rows = result.scalars().all()

        devices_result = await self.db.execute(
            select(DeviceMeta, DeviceSubsidy)
            .join(DeviceSubsidy, DeviceMeta.id == DeviceSubsidy.device_id)
            .where(DeviceSubsidy.effective_to.is_(None), DeviceMeta.is_active == True)
        )

        device_info = [
            {
                "device_name": dm.device_name,
                "tier": dm.tier,
                "release_price": dm.release_price,
                "carrier": ds.carrier,
                "subsidy": ds.subsidy,
                "net_price": dm.release_price - ds.subsidy,
            }
            for dm, ds in devices_result.all()
        ]

        latest = rows[0] if rows else None
        return {
            "agg_date": str(latest.agg_date) if latest else None,
            "agg_round": latest.agg_round if latest else None,
            "aggregation_data": [
                {
                    "agg_date": str(r.agg_date),
                    "agg_round": r.agg_round,
                    "agg_level": r.agg_level,
                    "carrier": r.carrier,
                    "device_id": r.device_id,
                    "avg_price": r.avg_price,
                    "top30_price": r.top30_price,
                    "max_price": r.max_price,
                    "sample_count": r.sample_count,
                }
                for r in rows
            ],
            "device_info": device_info,
        }
