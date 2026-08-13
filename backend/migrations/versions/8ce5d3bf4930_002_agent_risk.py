"""002_agent_risk

Revision ID: 8ce5d3bf4930
Revises: f5decfefc45f
Create Date: 2026-08-13 11:03:28.980499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ce5d3bf4930'
down_revision: Union[str, Sequence[str], None] = 'f5decfefc45f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('agents', sa.Column('current_risk_score', sa.Float(), nullable=True))
    op.add_column('agents', sa.Column('last_risk_update_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('agents', 'last_risk_update_at')
    op.drop_column('agents', 'current_risk_score')
