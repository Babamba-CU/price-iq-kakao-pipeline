from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class AggregationResponse(BaseModel):
    id: int
    agg_date: date
    agg_round: int
    agg_level: str
    region_key: Optional[str]
    carrier: str
    device_id: Optional[int]
    sub_type: Optional[str]
    support_type: Optional[str]
    plan_condition: Optional[str]
    sample_count: int
    avg_price: Optional[int]
    top30_price: Optional[int]
    max_price: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
