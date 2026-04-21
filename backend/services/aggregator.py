import logging
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from models.price_entry import PriceEntry
from models.price_aggregated import PriceAggregated

logger = logging.getLogger(__name__)

AGG_LEVELS = [
    ("national", None),
    ("sido", "region_sido"),
    ("sigungu", "region_sigungu"),
    ("dong", "region_dong"),
]


async def run_aggregation(db: AsyncSession, agg_date: date, agg_round: int) -> None:
    start_dt = datetime.combine(agg_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)

    base_query = (
        select(PriceEntry)
        .where(
            PriceEntry.collected_at >= start_dt,
            PriceEntry.collected_at <= now,
            PriceEntry.is_valid == True,
            PriceEntry.deleted_at.is_(None),
        )
    )
    result = await db.execute(base_query)
    entries = result.scalars().all()

    if not entries:
        logger.info(f"집계 대상 데이터 없음: {agg_date} round {agg_round}")
        return

    for level, region_field in AGG_LEVELS:
        groups: dict[tuple, list[int]] = {}
        for entry in entries:
            region_key = getattr(entry, region_field) if region_field else None
            if level != "national" and not region_key:
                continue
            key = (entry.carrier, entry.device_id, entry.sub_type, entry.support_type, entry.plan_condition, region_key)
            groups.setdefault(key, []).append(entry.price)

        for (carrier, device_id, sub_type, support_type, plan_condition, region_key), prices in groups.items():
            prices_sorted = sorted(prices)
            n = len(prices_sorted)
            avg_price = int(sum(prices_sorted) / n)
            top30_idx = int(n * 0.70)
            top30_price = prices_sorted[top30_idx] if top30_idx < n else prices_sorted[-1]
            max_price = max(prices_sorted)

            existing = await db.execute(
                select(PriceAggregated).where(
                    PriceAggregated.agg_date == agg_date,
                    PriceAggregated.agg_round == agg_round,
                    PriceAggregated.agg_level == level,
                    PriceAggregated.region_key == region_key,
                    PriceAggregated.carrier == carrier,
                    PriceAggregated.device_id == device_id,
                    PriceAggregated.sub_type == sub_type,
                    PriceAggregated.support_type == support_type,
                    PriceAggregated.plan_condition == plan_condition,
                )
            )
            row = existing.scalar_one_or_none()

            if row:
                row.sample_count = n
                row.avg_price = avg_price
                row.top30_price = top30_price
                row.max_price = max_price
            else:
                db.add(PriceAggregated(
                    agg_date=agg_date,
                    agg_round=agg_round,
                    agg_level=level,
                    region_key=region_key,
                    carrier=carrier,
                    device_id=device_id,
                    sub_type=sub_type,
                    support_type=support_type,
                    plan_condition=plan_condition,
                    sample_count=n,
                    avg_price=avg_price,
                    top30_price=top30_price,
                    max_price=max_price,
                ))

    await db.commit()
    logger.info(f"집계 완료: {agg_date} round {agg_round}")
