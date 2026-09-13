"""add registration profile fields

Revision ID: f1a2b3c4d5e6
Revises: 6e1fceb2e0a6
Create Date: 2026-09-12 16:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '6e1fceb2e0a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('registrations', sa.Column('sub_category', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('education_level', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('student_class', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('field_of_study', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('graduation_year', sa.Integer(), nullable=True))
    op.add_column('registrations', sa.Column('organization', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('designation', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('experience', sa.Integer(), nullable=True))
    op.add_column('registrations', sa.Column('state', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('city', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('paper_title', sa.String(), nullable=True))
    op.add_column('registrations', sa.Column('co_authors', sa.JSON(), nullable=True))
    op.add_column('registrations', sa.Column('accompanying_count', sa.Integer(), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('registrations', 'accompanying_count')
    op.drop_column('registrations', 'co_authors')
    op.drop_column('registrations', 'paper_title')
    op.drop_column('registrations', 'city')
    op.drop_column('registrations', 'state')
    op.drop_column('registrations', 'experience')
    op.drop_column('registrations', 'designation')
    op.drop_column('registrations', 'organization')
    op.drop_column('registrations', 'graduation_year')
    op.drop_column('registrations', 'field_of_study')
    op.drop_column('registrations', 'student_class')
    op.drop_column('registrations', 'education_level')
    op.drop_column('registrations', 'sub_category')
