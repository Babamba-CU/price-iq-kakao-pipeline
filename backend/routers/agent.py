from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.agent import AgentService
from services.auth import require_role

router = APIRouter()


@router.post("/analyze")
async def run_analysis(
    agg_round: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    svc = AgentService(db)
    report = await svc.analyze(agg_round=agg_round)
    return {"success": True, "data": report}


@router.get("/reports")
async def list_reports(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    svc = AgentService(db)
    reports = await svc.list_reports()
    return {"success": True, "data": reports}


@router.get("/reports/{report_id}")
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    svc = AgentService(db)
    report = await svc.get_report(report_id)
    return {"success": True, "data": report}
