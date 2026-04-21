from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class DeviceCreate(BaseModel):
    device_name: str
    aliases: Optional[list[str]] = None
    release_price: int
    release_date: Optional[date] = None
    is_active: bool = True


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    aliases: Optional[list[str]] = None
    release_price: Optional[int] = None
    release_date: Optional[date] = None
    is_active: Optional[bool] = None


class SubsidyCreate(BaseModel):
    carrier: str
    subsidy: int
    effective_from: date
    effective_to: Optional[date] = None


class SubsidyResponse(BaseModel):
    id: int
    device_id: int
    carrier: str
    subsidy: int
    effective_from: date
    effective_to: Optional[date]
    source: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceResponse(BaseModel):
    id: int
    device_name: str
    aliases: Optional[list]
    release_price: int
    tier: str
    release_date: Optional[date]
    is_active: bool
    created_at: datetime
    subsidies: list[SubsidyResponse] = []

    model_config = {"from_attributes": True}
