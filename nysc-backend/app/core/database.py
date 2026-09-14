"""
Database Configuration for NYSC-2026
PostgreSQL connection, deployment-agnostic
Lazy initialization to avoid connection on import
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Environment-based configuration (deployment-agnostic)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:password@localhost:5432/nysc_conference"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables - call explicitly, not on import"""
    Base.metadata.create_all(bind=engine)
