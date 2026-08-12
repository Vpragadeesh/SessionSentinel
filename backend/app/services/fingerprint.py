from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Event
from typing import List, Dict, Any
from datetime import datetime

SENSITIVE_RESOURCES = {"email", "phone", "address", "token", "key", "password", "ssn", "credit_card"}


async def build_fingerprint(session_id: str, db: AsyncSession) -> Dict[str, Any]:
    result = await db.execute(
        select(Event)
        .where(Event.session_id == session_id)
        .order_by(Event.timestamp)
    )
    events = result.scalars().all()
    
    tools = []
    actions = []
    sequence = []
    resources = []
    sensitive_access_count = 0
    
    for event in events:
        if event.tool and event.tool not in tools:
            tools.append(event.tool)
        if event.action and event.action not in actions:
            actions.append(event.action)
        if event.action:
            sequence.append(event.action.split("_")[0] if "_" in event.action else event.action)
        if event.resource and event.resource not in resources:
            resources.append(event.resource)
            if event.resource.lower() in SENSITIVE_RESOURCES:
                sensitive_access_count += 1
    
    return {
        "tools": tools,
        "actions": actions,
        "sequence": sequence,
        "resources": resources,
        "sensitive_access_count": sensitive_access_count
    }


def build_canonical_string(fingerprint: Dict[str, Any]) -> str:
    tool = fingerprint["tools"][0] if fingerprint["tools"] else "unknown"
    actions_str = " → ".join(fingerprint["actions"])
    return f"{tool} | {actions_str}"