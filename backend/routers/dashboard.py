from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from database import get_db
from models.price_entry import PriceEntry
from services.auth import require_role

router = APIRouter()


@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    today = date.today()
    result = await db.execute(
        select(
            PriceEntry.carrier,
            func.avg(PriceEntry.price).label("avg_price"),
            func.max(PriceEntry.price).label("max_price"),
            func.count(PriceEntry.id).label("count"),
        )
        .where(
            func.date(PriceEntry.collected_at) == today,
            PriceEntry.deleted_at.is_(None),
            PriceEntry.is_valid == True,
        )
        .group_by(PriceEntry.carrier)
    )
    rows = result.all()
    return {
        "success": True,
        "data": [
            {
                "carrier": r.carrier,
                "avg_price": int(r.avg_price) if r.avg_price else None,
                "max_price": r.max_price,
                "count": r.count,
            }
            for r in rows
        ],
    }
