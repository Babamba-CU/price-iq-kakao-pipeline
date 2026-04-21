from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.price_entry import PriceEntry, DataReport
from schemas.price_entry import PriceEntryResponse, DeleteRequest, ReportRequest, ReportResponse, ReportReviewRequest
from services.auth import AuthService, require_role
from services.parser import ParserService

router = APIRouter()


@router.post("/text", response_model=list[PriceEntryResponse])
async def ingest_text(
    raw_text: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    svc = ParserService(db)
    entries = await svc.parse_text(raw_text, submitted_by=current_user.id)
    return entries


@router.post("/image", response_model=list[PriceEntryResponse])
async def ingest_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    image_bytes = await file.read()
    svc = ParserService(db)
    entries = await svc.parse_image(image_bytes, submitted_by=current_user.id)
    return entries


@router.get("/pending", response_model=list[PriceEntryResponse])
async def list_pending(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    result = await db.execute(
        select(PriceEntry)
        .where(PriceEntry.is_valid == False, PriceEntry.deleted_at.is_(None))
        .order_by(PriceEntry.collected_at.desc())
    )
    return result.scalars().all()


@router.patch("/{entry_id}/validate", response_model=PriceEntryResponse)
async def validate_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    entry = await db.get(PriceEntry, entry_id)
    if not entry:
        raise HTTPException(404, "데이터를 찾을 수 없습니다")
    entry.is_valid = True
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: int,
    body: DeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    from datetime import datetime, timezone
    entry = await db.get(PriceEntry, entry_id)
    if not entry:
        raise HTTPException(404, "데이터를 찾을 수 없습니다")

    can_delete = (
        current_user.role in ("admin", "skt_staff")
        or entry.submitted_by == current_user.id
    )
    if not can_delete:
        raise HTTPException(403, "삭제 권한이 없습니다")

    entry.deleted_at = datetime.now(timezone.utc)
    entry.deleted_by = current_user.id
    entry.delete_reason = body.reason
    await db.commit()
    return {"success": True, "message": "삭제 완료"}


@router.post("/{entry_id}/report")
async def report_entry(
    entry_id: int,
    body: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff", "pnf_manager")),
):
    entry = await db.get(PriceEntry, entry_id)
    if not entry:
        raise HTTPException(404, "데이터를 찾을 수 없습니다")
    report = DataReport(
        price_entry_id=entry_id,
        reported_by=current_user.id,
        report_reason=body.reason,
    )
    db.add(report)
    await db.commit()
    return {"success": True, "message": "신고가 접수되었습니다"}


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff")),
):
    result = await db.execute(
        select(DataReport).order_by(DataReport.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/reports/{report_id}", response_model=ReportResponse)
async def review_report(
    report_id: int,
    body: ReportReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff")),
):
    from datetime import datetime, timezone
    report = await db.get(DataReport, report_id)
    if not report:
        raise HTTPException(404, "신고를 찾을 수 없습니다")

    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)

    if body.action == "approve_delete":
        report.status = "approved_delete"
        entry = await db.get(PriceEntry, report.price_entry_id)
        if entry:
            entry.deleted_at = datetime.now(timezone.utc)
            entry.deleted_by = current_user.id
            entry.delete_reason = f"신고 승인: {report.report_reason}"
    elif body.action == "reject":
        report.status = "rejected"
    else:
        raise HTTPException(400, "action은 approve_delete 또는 reject 이어야 합니다")

    await db.commit()
    await db.refresh(report)
    return report
