from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Integer, BigInteger, SmallInteger, Date, DateTime, UniqueConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from database import Base


class PriceAggregated(Base):
    __tablename__ = "price_aggregated"
    __table_args__ = (
        UniqueConstraint(
            "agg_date", "agg_round", "agg_level", "region_key",
            "carrier", "device_id", "sub_type", "support_type", "plan_condition",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    agg_date: Mapped[date] = mapped_column(Date, nullable=False)
    agg_round: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1: 12시, 2: 17시
    agg_level: Mapped[str] = mapped_column(String(10), nullable=False)  # national | sido | sigungu | dong
    region_key: Mapped[Optional[str]] = mapped_column(String(50))

    carrier: Mapped[str] = mapped_column(String(10), nullable=False)
    device_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("device_meta.id"))
    sub_type: Mapped[Optional[str]] = mapped_column(String(10))
    support_type: Mapped[Optional[str]] = mapped_column(String(10))
    plan_condition: Mapped[Optional[str]] = mapped_column(String(100))

    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    avg_price: Mapped[Optional[int]] = mapped_column(Integer)
    top30_price: Mapped[Optional[int]] = mapped_column(Integer)
    max_price: Mapped[Optional[int]] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
