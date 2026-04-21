from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class DeviceMeta(Base):
    __tablename__ = "device_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    aliases: Mapped[Optional[list]] = mapped_column(JSONB)
    release_price: Mapped[int] = mapped_column(Integer, nullable=False)
    release_date: Mapped[Optional[date]] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subsidies: Mapped[list["DeviceSubsidy"]] = relationship("DeviceSubsidy", back_populates="device", cascade="all, delete-orphan")

    @property
    def tier(self) -> str:
        if self.release_price >= 1500000:
            return "premium"
        elif self.release_price >= 900000:
            return "high"
        elif self.release_price >= 500000:
            return "mid"
        return "low"


class DeviceSubsidy(Base):
    __tablename__ = "device_subsidy"
    __table_args__ = (
        UniqueConstraint("device_id", "carrier", "effective_from"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(Integer, ForeignKey("device_meta.id", ondelete="CASCADE"), nullable=False)
    carrier: Mapped[str] = mapped_column(String(10), nullable=False)
    subsidy: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    device: Mapped["DeviceMeta"] = relationship("DeviceMeta", back_populates="subsidies")
