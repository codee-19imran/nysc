"""
Sets up the connection to PostgreSQL.

- `engine` is the actual connection to the database.
- `SessionLocal` creates a new "conversation" with the database per request.
- `Base` is what every model file (app/models/*.py) inherits from.
- `get_db()` is used in routers like: `db: Session = Depends(get_db)`
  It opens a session, hands it to the route, and closes it afterwards
  even if the route raises an error.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
