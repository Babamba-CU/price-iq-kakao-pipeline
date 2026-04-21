from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PriceEntryCreate(BaseModel):
    carrier: str
    device_name: Optional[str] = None
    sub_type: str
    support_type: str
    plan_condition: Optional[str] = None
    region_sido: Optional[str] = None
    region_sigungu: Optional[str] = None
    region_dong: Optional[str] = None
    store_type: Optional[str] = None
    store_code: Optional[str] = None
    policy_start_at: Optional[datetime] = None
    price: int
    note: Optional[str] = None


class PriceEntryResponse(BaseModel):
    id: int
    collected_at: datetime
    source_type: str
    carrier: str
    device_id: Optional[int]
    device_name: Optional[str]
    sub_type: str
    support_type: str
    plan_condition: Optional[str]
    region_sido: Optional[str]
    region_sigungu: Optional[str]
    region_dong: Optional[str]
    store_type: Optional[str]
    store_code: Optional[str]
    price: int
    is_valid: bool
    note: Optional[str]
    deleted_at: Optional[datetime]
    submitted_by: Optional[int]

    model_config = {"from_attributes": True}


class DeleteRequest(BaseModel):
    reason: str


class ReportRequest(BaseModel):
    reason: str


class ReportResponse(BaseModel):
    id: int
    price_entry_id: int
    reported_by: int
    report_reason: str
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportReviewRequest(BaseModel):
    action: str  # approve_delete | reject
