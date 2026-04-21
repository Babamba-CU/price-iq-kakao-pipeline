import logging
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models.price_aggregated import PriceAggregated
from models.device_meta import DeviceMeta, DeviceSubsidy

logger = logging.getLogger(__name__)


async def check_alerts(db: AsyncSession, agg_date: date, agg_round: int) -> list[dict]:
    alerts = []

    # 알림 1: net_price <= 0
    result = await db.execute(
        select(DeviceMeta, DeviceSubsidy)
        .join(DeviceSubsidy, DeviceMeta.id == DeviceSubsidy.device_id)
        .where(DeviceSubsidy.effective_to.is_(None), DeviceMeta.is_active == True)
    )
    for device, subsidy in result.all():
        net = device.release_price - subsidy.subsidy
        if net <= 0:
            alerts.append({
                "type": "net_price_alert",
                "device_name": device.device_name,
                "carrier": subsidy.carrier,
                "net_price": net,
            })
            logger.warning(f"[ALERT] net_price ≤ 0: {device.device_name} / {subsidy.carrier} = {net}")

    # 알림 2: 이전 차수 대비 급등
    prev_round = agg_round - 1 if agg_round > 1 else None
    prev_date = date.fromordinal(agg_date.toordinal() - 1) if agg_round == 1 else agg_date
    prev_round_val = 2 if agg_round == 1 else prev_round

    if prev_round_val:
        curr = await db.execute(
            select(PriceAggregated).where(
                PriceAggregated.agg_date == agg_date,
                PriceAggregated.agg_round == agg_round,
                PriceAggregated.agg_level == "national",
            )
        )
        curr_rows = {(r.carrier, r.device_id): r for r in curr.scalars().all()}

        prev = await db.execute(
            select(PriceAggregated).where(
                PriceAggregated.agg_date == prev_date,
                PriceAggregated.agg_round == prev_round_val,
                PriceAggregated.agg_level == "national",
            )
        )
        for prev_row in prev.scalars().all():
            key = (prev_row.carrier, prev_row.device_id)
            curr_row = curr_rows.get(key)
            if curr_row and prev_row.avg_price and curr_row.avg_price:
                change = (curr_row.avg_price - prev_row.avg_price) / prev_row.avg_price
                if change >= settings.alert_price_surge_threshold:
                    alerts.append({
                        "type": "price_surge",
                        "carrier": prev_row.carrier,
                        "device_id": prev_row.device_id,
                        "prev_avg": prev_row.avg_price,
                        "curr_avg": curr_row.avg_price,
                        "change_rate": round(change, 4),
                    })

    return alerts
