#!/usr/bin/env python3
"""
SessionSentinel — Realistic DB Seed Script
==========================================
Populates the database with believable sample data:
  - 8 named agent identities
  - 42 normal baseline sessions (customer support, order management, product lookup)
  - 18 adversarial attack sessions across 4 attack vectors
  - 4 detected patterns with realistic LLM explanations + risk scores

Run from: /home/pragadeesh/aivar/SessionSentinel/backend
Usage:    .venv/bin/python seed_realistic.py
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
import uuid

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import delete

from app.models import Agent, Session, Event, Pattern, Alert
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Helpers ───────────────────────────────────────────────────────────

def sid():
    return f"sess_{uuid.uuid4().hex[:8]}"

def eid():
    return f"evt_{uuid.uuid4().hex[:8]}"

def pid():
    return f"pattern_{uuid.uuid4().hex[:8]}"
    
def aid():
    return f"alert_{uuid.uuid4().hex[:8]}"

def now_minus(hours=0, minutes=0, days=0):
    return datetime.now(timezone.utc) - timedelta(hours=hours, minutes=minutes, days=days)


# ── Agent Definitions ─────────────────────────────────────────────────

AGENTS = [
    # Normal support agents
    {"id": "agent_priya_k",   "name": "Priya Krishnamurthy",  "type": "customer_support",   "risk": 0.0},
    {"id": "agent_lucas_m",   "name": "Lucas Mendes",          "type": "customer_support",   "risk": 0.0},
    {"id": "agent_sara_j",    "name": "Sara Johnson",          "type": "customer_support",   "risk": 0.0},
    {"id": "agent_tommy_n",   "name": "Tommy Nguyen",          "type": "customer_support",   "risk": 0.0},
    # Suspicious agents (elevated risk)
    {"id": "agent_alex_b",    "name": "Alex Bernstein",        "type": "third_party_vendor", "risk": 0.85},
    {"id": "agent_marko_s",   "name": "Marko Stankovic",       "type": "third_party_vendor", "risk": 0.65},
    {"id": "agent_dan_r",     "name": "Daniel Reyes",          "type": "internal_automation","risk": 0.45},
    {"id": "agent_nina_p",    "name": "Nina Pavlova",          "type": "third_party_vendor", "risk": 0.95},
]


def make_events(session_id, base, tool_calls):
    events = []
    for (tool, action, resource, status, offset_sec) in tool_calls:
        ts = base + timedelta(seconds=offset_sec)
        
        guardrail_outcome = "BLOCK" if status == "denied" else "PASS"
        
        events.append(Event(
            id=eid(), session_id=session_id, timestamp=ts,
            type="tool_call", tool=tool, action=action,
            resource=resource, status=status,
            guardrail_outcome=guardrail_outcome,
            guardrail_rule="default_policy" if guardrail_outcome == "BLOCK" else None
        ))
    return events


# ─────────────────────────────────────────────────────────────────────
#  NORMAL SESSIONS — 42 sessions
# ─────────────────────────────────────────────────────────────────────

def build_normal_sessions():
    sessions = []

    priya_scenarios = [
        (2, 0,  [("order_db","search_order","ORD-88421","success",0),("order_db","get_status","ORD-88421","success",4),("customer_db","get_profile","customer.email","success",9)]),
        (5, 4,  [("product_db","search_product","Sony WH-1000XM5","success",0),("product_db","get_product_price","product.price","success",3),("order_db","create_order","cart.items","success",11)]),
        (9, 8,  [("customer_db","search_customer","customer.name","success",0),("customer_db","get_profile","customer.email","success",6),("customer_db","update_preference","customer.preferences","success",12)]),
        (14,12, [("order_db","search_order","ORD-91033","success",0),("order_db","get_tracking","order.tracking","success",5),("notify_svc","send_sms","customer.phone","success",10)]),
        (20,16, [("product_db","get_inventory","product.stock","success",0),("product_db","search_product","iPhone 15 Pro","success",4),("product_db","get_product_price","product.price","success",9)]),
        (26,20, [("user_db","login","user.credentials","success",0),("user_db","fetch_account","user.profile","success",3),("order_db","list_orders","order.history","success",8)]),
        (31,24, [("customer_db","get_profile","customer.email","success",0),("billing_db","get_invoice","invoice.pdf","success",6),("notify_svc","send_email","customer.email","success",14)]),
        (38,28, [("order_db","search_order","ORD-70214","success",0),("order_db","request_refund","order.refund","success",7),("customer_db","update_notes","customer.notes","success",15)]),
        (44,32, [("product_db","search_product","Samsung 4K TV","success",0),("product_db","get_product_price","product.price","success",3),("product_db","check_warranty","product.warranty","success",9)]),
        (51,36, [("user_db","fetch_account","user.profile","success",0),("user_db","update_preference","user.settings","success",5)]),
    ]
    for (h, m, calls) in priya_scenarios:
        base = now_minus(hours=h, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_priya_k", started_at=base, ended_at=base+timedelta(minutes=4), event_count=len(calls)), make_events(sid_, base, calls)))

    lucas_scenarios = [
        (3, 0,  [("order_db","search_order","ORD-55889","success",0),("order_db","get_status","ORD-55889","success",5),("order_db","request_return","return.label","success",12)]),
        (7, 6,  [("customer_db","search_customer","customer.name","success",0),("customer_db","get_profile","customer.email","success",4),("billing_db","issue_refund","payment.refund","success",11)]),
        (12,12, [("product_db","search_product","Logitech MX Master 3","success",0),("product_db","get_product_price","product.price","success",3),("product_db","get_inventory","product.stock","success",8)]),
        (18,18, [("user_db","login","user.credentials","success",0),("order_db","list_orders","order.history","success",5),("order_db","get_status","ORD-60193","success",11)]),
        (23,24, [("order_db","search_order","ORD-72441","success",0),("order_db","get_tracking","order.tracking","success",6),("notify_svc","send_email","customer.email","success",13)]),
        (29,30, [("customer_db","get_profile","customer.preferences","success",0),("billing_db","get_invoice","invoice.id","success",7)]),
        (35,36, [("product_db","search_product","Dyson V15","success",0),("product_db","get_product_price","product.price","success",4),("product_db","check_compatibility","product.specs","success",10)]),
        (43,42, [("order_db","search_order","ORD-83012","success",0),("order_db","apply_discount","order.discount","success",8),("customer_db","update_notes","customer.notes","success",15)]),
        (49,48, [("user_db","fetch_account","user.profile","success",0),("user_db","update_preference","user.settings","success",5),("order_db","list_orders","order.history","success",10)]),
        (56,54, [("billing_db","get_invoice","invoice.pdf","success",0),("billing_db","issue_refund","payment.refund","success",8)]),
    ]
    for (h, m, calls) in lucas_scenarios:
        base = now_minus(hours=h, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_lucas_m", started_at=base, ended_at=base+timedelta(minutes=5), event_count=len(calls)), make_events(sid_, base, calls)))

    sara_scenarios = [
        (1, 0,  [("product_db","search_product","Apple MacBook Air M3","success",0),("product_db","get_product_price","product.price","success",4),("product_db","check_warranty","product.warranty","success",9)]),
        (6, 5,  [("customer_db","search_customer","customer.id","success",0),("customer_db","get_profile","customer.email","success",5),("order_db","list_orders","order.history","success",11)]),
        (11,10, [("product_db","get_inventory","product.stock","success",0),("product_db","search_product","Sony PlayStation 5","success",5),("notify_svc","send_email","customer.email","success",10)]),
        (16,15, [("user_db","login","user.credentials","success",0),("user_db","fetch_account","user.profile","success",3)]),
        (22,20, [("product_db","search_product","Canon EOS R6","success",0),("product_db","get_product_price","product.price","success",5),("product_db","get_inventory","product.stock","success",11),("order_db","create_order","cart.items","success",18)]),
        (27,25, [("customer_db","get_profile","customer.preferences","success",0),("billing_db","get_invoice","invoice.id","success",6),("billing_db","issue_refund","payment.refund","success",14)]),
        (33,30, [("order_db","search_order","ORD-44819","success",0),("order_db","get_status","ORD-44819","success",4),("order_db","request_return","return.label","success",11)]),
        (40,35, [("product_db","search_product","GoPro Hero 12","success",0),("product_db","get_product_price","product.price","failed",3),("product_db","get_product_price","product.price","success",8)]),
        (46,40, [("customer_db","update_preference","customer.preferences","success",0),("customer_db","update_notes","customer.notes","success",6)]),
        (53,45, [("order_db","search_order","ORD-99201","success",0),("order_db","get_tracking","order.tracking","success",5),("notify_svc","send_sms","customer.phone","success",11)]),
        (60,50, [("product_db","search_product","Bose QuietComfort 45","success",0),("product_db","get_product_price","product.price","success",4),("product_db","check_warranty","product.warranty","success",10)]),
        (68,55, [("user_db","fetch_account","user.profile","success",0),("billing_db","get_payment_method","billing.card","success",6),("billing_db","update_payment","billing.card","success",14)]),
    ]
    for (h, m, calls) in sara_scenarios:
        base = now_minus(hours=h, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_sara_j", started_at=base, ended_at=base+timedelta(minutes=5), event_count=len(calls)), make_events(sid_, base, calls)))

    tommy_scenarios = [
        (4, 0,  [("user_db","login","user.credentials","success",0),("user_db","fetch_account","user.profile","success",4),("user_db","update_preference","user.settings","success",10)]),
        (8, 6,  [("customer_db","search_customer","customer.name","success",0),("customer_db","get_profile","customer.email","success",5),("customer_db","update_preference","customer.preferences","success",11)]),
        (13,12, [("billing_db","get_invoice","invoice.pdf","success",0),("billing_db","issue_refund","payment.refund","success",7),("notify_svc","send_email","customer.email","success",14)]),
        (17,18, [("user_db","fetch_account","user.profile","success",0),("billing_db","get_payment_method","billing.card","success",6)]),
        (24,24, [("order_db","list_orders","order.history","success",0),("order_db","get_status","ORD-31005","success",5),("customer_db","get_profile","customer.address","success",11)]),
        (30,30, [("user_db","login","user.credentials","failed",0),("user_db","login","user.credentials","success",8),("user_db","fetch_account","user.profile","success",12)]),
        (36,36, [("billing_db","get_invoice","invoice.id","success",0),("billing_db","update_payment","billing.card","success",7)]),
        (42,42, [("customer_db","search_customer","customer.id","success",0),("customer_db","get_profile","customer.email","success",5),("customer_db","update_notes","customer.notes","success",11)]),
        (47,48, [("order_db","search_order","ORD-66120","success",0),("order_db","apply_discount","order.discount","success",6),("notify_svc","send_sms","customer.phone","success",13)]),
        (54,54, [("user_db","fetch_account","user.profile","success",0),("user_db","update_preference","user.settings","success",5),("user_db","logout","user.session","success",9)]),
    ]
    for (h, m, calls) in tommy_scenarios:
        base = now_minus(hours=h, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_tommy_n", started_at=base, ended_at=base+timedelta(minutes=4), event_count=len(calls)), make_events(sid_, base, calls)))

    return sessions


# ─────────────────────────────────────────────────────────────────────
#  ADVERSARIAL SESSIONS — 18 sessions
# ─────────────────────────────────────────────────────────────────────

def build_adversarial_sessions():
    sessions = []

    # Boundary Probing — Alex Bernstein (6 sessions)
    alex_probes = [
        (1,10,[("customer_db","search_customer","customer.email","success",0),("customer_db","get_email","customer.email","success",5),("customer_db","get_phone","customer.phone","success",10),("customer_db","get_address","customer.address","success",15),("customer_db","get_ssn","customer.ssn","denied",20)]),
        (1,35,[("customer_db","search_customer","customer.email","success",0),("customer_db","get_email","customer.email","success",4),("customer_db","get_phone","customer.phone","success",9),("customer_db","get_address","customer.address","success",14),("customer_db","get_ssn","customer.ssn","denied",19),("customer_db","get_dob","customer.dob","denied",24)]),
        (2,5, [("customer_db","search_customer","customer.email","success",0),("customer_db","get_email","customer.email","success",3),("customer_db","get_phone","customer.phone","success",8),("customer_db","get_full_profile","customer.*","denied",13)]),
        (2,55,[("customer_db","get_email","customer.email","success",0),("customer_db","get_phone","customer.phone","success",6),("customer_db","get_address","customer.address","success",12),("customer_db","get_payment_info","customer.card","denied",17)]),
        (3,15,[("customer_db","search_customer","customer.name","success",0),("customer_db","get_email","customer.email","success",5),("customer_db","get_phone","customer.phone","success",10),("customer_db","get_address","customer.address","success",15)]),
        (3,50,[("customer_db","get_email","customer.email","success",0),("customer_db","get_phone","customer.phone","success",5),("customer_db","get_address","customer.address","success",11),("customer_db","get_dob","customer.dob","denied",16),("customer_db","get_ssn","customer.ssn","denied",21)]),
    ]
    for (d, m, calls) in alex_probes:
        base = now_minus(days=d, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_alex_b", started_at=base, ended_at=base+timedelta(minutes=3), event_count=len(calls)), make_events(sid_, base, calls)))

    # Credential Harvesting — Marko Stankovic (5 sessions)
    marko_probes = [
        (1,20,[("auth_service","get_token","auth.token","success",0),("auth_service","get_key","auth.key","success",6),("user_db","get_password","user.password","denied",11),("token_service","refresh_token","auth.session","success",17)]),
        (1,45,[("auth_service","authenticate","auth.token","success",0),("auth_service","get_token","auth.token","success",5),("user_db","get_password","user.password","denied",10),("auth_service","get_key","auth.key","denied",16)]),
        (2,10,[("auth_service","get_token","auth.token","success",0),("auth_service","get_key","auth.key","success",7),("token_service","refresh_token","auth.session","success",13),("user_db","get_password","user.password","denied",19)]),
        (2,40,[("auth_service","authenticate","auth.token","success",0),("auth_service","get_token","auth.token","success",6),("auth_service","get_key","auth.key","success",12),("user_db","get_password","user.password","denied",17),("token_service","steal_session","auth.session","denied",23)]),
        (3,5, [("auth_service","login","auth.token","success",0),("auth_service","get_token","auth.token","success",5),("user_db","get_password","user.password","denied",10)]),
    ]
    for (d, m, calls) in marko_probes:
        base = now_minus(days=d, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_marko_s", started_at=base, ended_at=base+timedelta(minutes=3), event_count=len(calls)), make_events(sid_, base, calls)))

    # Tool Enumeration — Daniel Reyes (4 sessions)
    dan_probes = [
        (1,5, [("customer_db","search_customer","customer.*","success",0),("order_db","list_orders","order.*","success",5),("product_db","list_products","product.*","success",10),("user_db","list_users","user.*","denied",15),("analytics_db","get_report","analytics.*","denied",20),("inventory_db","get_inventory","inventory.*","denied",25),("payment_db","list_payments","payment.*","denied",30)]),
        (1,30,[("customer_db","list_customers","customer.*","success",0),("order_db","search_order","order.*","success",4),("product_db","search_product","product.*","success",9),("shipping_db","list_shipments","shipping.*","denied",14),("analytics_db","list_reports","analytics.*","denied",19)]),
        (2,15,[("customer_db","get_customer","customer.*","success",0),("order_db","get_order","order.*","success",5),("product_db","get_product","product.*","success",10),("payment_db","get_payment","payment.*","denied",15),("inventory_db","list_inventory","inventory.*","denied",20)]),
        (2,50,[("customer_db","search_customer","customer.*","success",0),("user_db","search_user","user.*","denied",6),("analytics_db","get_metrics","analytics.*","denied",12),("payment_db","search_payments","payment.*","denied",18)]),
    ]
    for (d, m, calls) in dan_probes:
        base = now_minus(days=d, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_dan_r", started_at=base, ended_at=base+timedelta(minutes=4), event_count=len(calls)), make_events(sid_, base, calls)))

    # Privilege Escalation — Nina Pavlova (3 sessions)
    nina_probes = [
        (1,15,[("user_db","login","user.credentials","success",0),("user_db","fetch_account","user.profile","success",5),("admin_api","get_admin_panel","admin.panel","denied",10),("admin_api","list_all_users","user.*","denied",15),("admin_api","grant_permission","admin.role","denied",20)]),
        (2,5, [("auth_service","authenticate","auth.token","success",0),("admin_api","access_audit_log","audit.log","denied",6),("admin_api","modify_permissions","admin.acl","denied",12),("admin_api","export_user_data","user.export","denied",18)]),
        (2,40,[("user_db","login","user.credentials","success",0),("user_db","fetch_account","user.profile","success",4),("admin_api","get_admin_panel","admin.panel","denied",9),("admin_api","reset_all_passwords","admin.reset","denied",15)]),
    ]
    for (d, m, calls) in nina_probes:
        base = now_minus(days=d, minutes=m)
        sid_ = sid()
        sessions.append((Session(id=sid_, agent_id="agent_nina_p", started_at=base, ended_at=base+timedelta(minutes=3), event_count=len(calls)), make_events(sid_, base, calls)))

    return sessions


# ─────────────────────────────────────────────────────────────────────
#  DETECTED ALERTS
# ─────────────────────────────────────────────────────────────────────

def build_alerts():
    now = datetime.now(timezone.utc)
    return [
        Alert(
            id=aid(), agent_id="agent_alex_b", technique="Boundary Probing", severity="CRITICAL",
            risk_score=0.85,
            summary="Agent 'Alex Bernstein' has exhibited a highly consistent cross-session behavioral pattern classified as Boundary Probing.",
            evidence={"sessions": 6, "blocked": 4, "similarity": 0.91},
            created_at=now - timedelta(hours=1, minutes=15),
            status="open",
        ),
        Alert(
            id=aid(), agent_id="agent_marko_s", technique="Privilege Escalation", severity="HIGH",
            risk_score=0.65,
            summary="Agent 'Marko Stankovic' demonstrates a HIGH-severity credential harvesting pattern across 5 sessions.",
            evidence={"sessions": 5, "escalation_steps": 3, "max_level_reached": 6},
            created_at=now - timedelta(hours=2, minutes=30),
            status="open",
        ),
        Alert(
            id=aid(), agent_id="agent_dan_r", technique="Systematic Enumeration", severity="MEDIUM",
            risk_score=0.45,
            summary="Agent 'Daniel Reyes' is systematically enumerating all accessible API tool endpoints.",
            evidence={"sessions": 4, "unique_targets_enumerated": 15, "sequentiality_score": 0.84},
            created_at=now - timedelta(hours=3, minutes=45),
            status="open",
        ),
        Alert(
            id=aid(), agent_id="agent_nina_p", technique="Privilege Escalation", severity="CRITICAL",
            risk_score=0.95,
            summary="Agent 'Nina Pavlova' is attempting privilege escalation by repeatedly invoking admin_api endpoints.",
            evidence={"sessions": 3, "escalation_steps": 2, "max_level_reached": 8},
            created_at=now - timedelta(hours=0, minutes=45),
            status="open",
        ),
    ]


# ─────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────

async def seed():
    print("SessionSentinel - Realistic DB Seed")
    print("=" * 45)

    async with SessionLocal() as db:
        print("  Clearing existing data...")
        await db.execute(delete(Pattern))
        await db.execute(delete(Alert))
        await db.execute(delete(Event))
        await db.execute(delete(Session))
        await db.execute(delete(Agent))
        await db.commit()

        print("  Inserting 8 named agent identities...")
        for a in AGENTS:
            now = datetime.now(timezone.utc)
            db.add(Agent(
                id=a["id"], name=a["name"], type=a["type"],
                first_seen_at=now - timedelta(days=7),
                last_seen_at=now,
                current_risk_score=a["risk"],
                last_risk_update_at=now if a["risk"] > 0 else None,
            ))
        await db.commit()

        print("  Building 42 realistic normal sessions...")
        normal = build_normal_sessions()
        for session, events in normal:
            db.add(session)
            for evt in events:
                db.add(evt)
        await db.commit()

        print("  Building 18 adversarial attack sessions...")
        adversarial = build_adversarial_sessions()
        for session, events in adversarial:
            db.add(session)
            for evt in events:
                db.add(evt)
        await db.commit()

        print("  Inserting 4 detected alerts...")
        for a in build_alerts():
            db.add(a)
        await db.commit()

    total = len(normal) + len(adversarial)
    total_events = sum(len(e) for _, e in normal + adversarial)
    print()
    print("=" * 45)
    print("Seed complete!")
    print(f"  Agents:   {len(AGENTS)}")
    print(f"  Sessions: {total}  (42 normal + 18 adversarial)")
    print(f"  Events:   {total_events}")
    print(f"  Alerts:   4")
    print()


if __name__ == "__main__":
    asyncio.run(seed())
