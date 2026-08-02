from sqlalchemy import Column, String , ForeignKey , Boolean , Integer , Enum , DateTime , CheckConstraint
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, index=True)  # uuid
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=True)   # NULL for Google users
    pfp = Column(String, nullable=True)
    onboarded = Column(Boolean, default=False)
    provider = Column(String,default="EMAIL")  # EMAIL / GOOGLE
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime,default=datetime.utcnow,onupdate=datetime.utcnow)