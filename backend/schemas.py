from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    email: Optional[EmailStr] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    xpTotal: int
    streak: int
    createdAt: datetime

    class Config:
        from_attributes = True


