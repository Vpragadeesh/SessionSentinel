"""003_guardrail_metadata

Revision ID: eec22ba7d448
Revises: 8ce5d3bf4930
Create Date: 2026-08-13 11:03:29.363485

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eec22ba7d448'
down_revision: Union[str, Sequence[str], None] = '8ce5d3bf4930'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('events', sa.Column('guardrail_outcome', sa.String(length=30), nullable=True))
    op.add_column('events', sa.Column('guardrail_rule', sa.String(length=100), nullable=True))
    op.add_column('events', sa.Column('input_hash', sa.String(length=128), nullable=True))
    op.add_column('events', sa.Column('metadata_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('events', 'metadata_json')
    op.drop_column('events', 'input_hash')
    op.drop_column('events', 'guardrail_rule')
    op.drop_column('events', 'guardrail_outcome')
