from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.price_aggregated import PriceAggregated
from schemas.aggregation import AggregationResponse
from services.auth import require_role

router = APIRouter()


@router.get("/latest", response_model=list[AggregationResponse])
async def latest_aggregation(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    subq = (
        select(
            PriceAggregated.agg_date,
            PriceAggregated.agg_round,
        )
        .where(PriceAggregated.agg_level == "national")
        .order_by(PriceAggregated.agg_date.desc(), PriceAggregated.agg_round.desc())
        .limit(1)
        .subquery()
    )
    result = await db.execute(
        select(PriceAggregated)
        .where(
            PriceAggregated.agg_level == "national",
            PriceAggregated.agg_date == subq.c.agg_date,
            PriceAggregated.agg_round == subq.c.agg_round,
        )
    )
    return result.scalars().all()


@router.get("/region/{level}", response_model=list[AggregationResponse])
async def region_aggregation(
    level: str,
    agg_date: Optional[date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    stmt = select(PriceAggregated).where(PriceAggregated.agg_level == level)
    if agg_date:
        stmt = stmt.where(PriceAggregated.agg_date == agg_date)
    result = await db.execute(stmt.order_by(PriceAggregated.agg_date.desc()))
    return result.scalars().all()


@router.get("/device/{device_id}", response_model=list[AggregationResponse])
async def device_aggregation(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    result = await db.execute(
        select(PriceAggregated)
        .where(PriceAggregated.device_id == device_id)
        .order_by(PriceAggregated.agg_date.desc(), PriceAggregated.agg_round.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.get("/history", response_model=list[AggregationResponse])
async def aggregation_history(
    start_date: date = Query(...),
    end_date: date = Query(...),
    carrier: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    stmt = select(PriceAggregated).where(
        PriceAggregated.agg_date >= start_date,
        PriceAggregated.agg_date <= end_date,
        PriceAggregated.agg_level == "national",
    )
    if carrier:
        stmt = stmt.where(PriceAggregated.carrier == carrier)
    result = await db.execute(stmt.order_by(PriceAggregated.agg_date, PriceAggregated.agg_round))
    return result.scalars().all()
