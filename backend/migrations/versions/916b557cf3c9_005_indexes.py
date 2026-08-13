"""005_indexes

Revision ID: 916b557cf3c9
Revises: 0585065ae0bb
Create Date: 2026-08-13 11:03:30.158245

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '916b557cf3c9'
down_revision: Union[str, Sequence[str], None] = '0585065ae0bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_events_session_id', 'events', ['session_id'])
    op.create_index('ix_sessions_agent_id', 'sessions', ['agent_id'])
    op.create_index('ix_alerts_agent_id', 'alerts', ['agent_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_alerts_agent_id', table_name='alerts')
    op.drop_index('ix_sessions_agent_id', table_name='sessions')
    op.drop_index('ix_events_session_id', table_name='events')
