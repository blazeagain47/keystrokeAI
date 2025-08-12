from sqlalchemy import Column, Integer, String, DateTime, func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=False, nullable=True)
    password_hash = Column(String(255), nullable=False)
    xp_total = Column(Integer, nullable=False, default=0)
    streak = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


