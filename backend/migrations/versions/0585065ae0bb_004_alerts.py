"""004_alerts

Revision ID: 0585065ae0bb
Revises: eec22ba7d448
Create Date: 2026-08-13 11:03:29.786685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0585065ae0bb'
down_revision: Union[str, Sequence[str], None] = 'eec22ba7d448'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('alerts',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('agent_id', sa.String(), nullable=False),
    sa.Column('technique', sa.String(length=50), nullable=False),
    sa.Column('severity', sa.String(length=20), nullable=False),
    sa.Column('risk_score', sa.Float(), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('evidence', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('alerts')
