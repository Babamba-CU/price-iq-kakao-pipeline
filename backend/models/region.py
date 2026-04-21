from typing import Optional

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[str] = mapped_column(String(10), nullable=False)  # sido | sigungu | dong
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("regions.id"))

    children: Mapped[list["Region"]] = relationship("Region", back_populates="parent")
    parent: Mapped[Optional["Region"]] = relationship("Region", back_populates="children", remote_side=[id])
