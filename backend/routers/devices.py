from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.device_meta import DeviceMeta, DeviceSubsidy
from schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, SubsidyCreate, SubsidyResponse
from services.auth import require_role

router = APIRouter()


@router.get("", response_model=list[DeviceResponse])
async def list_devices(
    tier: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    stmt = select(DeviceMeta).where(DeviceMeta.is_active == True)
    result = await db.execute(stmt)
    devices = result.scalars().all()
    if tier:
        devices = [d for d in devices if d.tier == tier]
    return devices


@router.post("", response_model=DeviceResponse)
async def create_device(
    body: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff")),
):
    device = DeviceMeta(**body.model_dump(), created_by=current_user.id, updated_by=current_user.id)
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    body: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff")),
):
    device = await db.get(DeviceMeta, device_id)
    if not device:
        raise HTTPException(404, "단말을 찾을 수 없습니다")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(device, field, value)
    device.updated_by = current_user.id
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/{device_id}/subsidy", response_model=SubsidyResponse)
async def add_subsidy(
    device_id: int,
    body: SubsidyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff")),
):
    device = await db.get(DeviceMeta, device_id)
    if not device:
        raise HTTPException(404, "단말을 찾을 수 없습니다")
    subsidy = DeviceSubsidy(device_id=device_id, updated_by=current_user.id, **body.model_dump())
    db.add(subsidy)
    await db.commit()
    await db.refresh(subsidy)
    return subsidy


@router.patch("/{device_id}/subsidy/{carrier}", response_model=SubsidyResponse)
async def update_subsidy(
    device_id: int,
    carrier: str,
    body: SubsidyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "skt_staff")),
):
    result = await db.execute(
        select(DeviceSubsidy)
        .where(
            DeviceSubsidy.device_id == device_id,
            DeviceSubsidy.carrier == carrier,
            DeviceSubsidy.effective_to.is_(None),
        )
    )
    subsidy = result.scalar_one_or_none()
    if not subsidy:
        raise HTTPException(404, "공시지원금 정보를 찾을 수 없습니다")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(subsidy, field, value)
    subsidy.updated_by = current_user.id
    await db.commit()
    await db.refresh(subsidy)
    return subsidy


@router.get("/alerts")
async def device_alerts(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "skt_staff", "pnf_manager", "member")),
):
    result = await db.execute(
        select(DeviceMeta, DeviceSubsidy)
        .join(DeviceSubsidy, DeviceMeta.id == DeviceSubsidy.device_id)
        .where(
            DeviceSubsidy.effective_to.is_(None),
            DeviceMeta.is_active == True,
        )
    )
    rows = result.all()
    alerts = [
        {
            "device_id": dm.id,
            "device_name": dm.device_name,
            "carrier": ds.carrier,
            "release_price": dm.release_price,
            "subsidy": ds.subsidy,
            "net_price": dm.release_price - ds.subsidy,
        }
        for dm, ds in rows
        if dm.release_price - ds.subsidy <= 0
    ]
    return {"success": True, "data": alerts}
