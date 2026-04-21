from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, DateTime, BigInteger, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class PriceEntry(Base):
    __tablename__ = "price_entry"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    source_type: Mapped[str] = mapped_column(String(10), nullable=False)  # text | image
    raw_content: Mapped[Optional[str]] = mapped_column(Text)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    carrier: Mapped[str] = mapped_column(String(10), nullable=False)  # SKT | KT | LGU

    device_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("device_meta.id"))
    device_name: Mapped[Optional[str]] = mapped_column(String(100))

    sub_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 010 | MNP | 기변
    support_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 선약 | 공시

    plan_condition: Mapped[Optional[str]] = mapped_column(String(100))

    region_sido: Mapped[Optional[str]] = mapped_column(String(20))
    region_sigungu: Mapped[Optional[str]] = mapped_column(String(30))
    region_dong: Mapped[Optional[str]] = mapped_column(String(30))

    store_type: Mapped[Optional[str]] = mapped_column(String(20))
    store_code: Mapped[Optional[str]] = mapped_column(String(20))

    policy_start_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    price: Mapped[int] = mapped_column(Integer, nullable=False)

    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[Optional[str]] = mapped_column(Text)

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    delete_reason: Mapped[Optional[str]] = mapped_column(String(200))

    submitted_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))


class DataReport(Base):
    __tablename__ = "data_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    price_entry_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("price_entry.id"), nullable=False)
    reported_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    report_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved_delete | rejected
    reviewed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
