"""update enum values

Revision ID: 6e1fceb2e0a6
Revises: 4d4fceb2e0a5
Create Date: 2026-09-12 15:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6e1fceb2e0a6'
down_revision = '4d4fceb2e0a5'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Disable transactions since ALTER TYPE cannot be run inside a transaction block
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))
    
    try:
        connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'committee_member'"))
    except Exception:
        pass
        
    try:
        connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'volunteer'"))
    except Exception:
        pass
        
    try:
        connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'presenter'"))
    except Exception:
        pass
        
    try:
        connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'delegate'"))
    except Exception:
        pass

def downgrade() -> None:
    pass
