from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Any
from services.strategy import strategy_service
from database import get_db_connection
import json

router = APIRouter(prefix="/strategy", tags=["strategy"])

class EventRequest(BaseModel):
    event_type: str
    payload: dict

class StateResponse(BaseModel):
    plan_id: str
    kpis: List[dict]
    okrs: List[dict]
    risks: List[dict]
    sprints: List[dict]
    computed: dict

@router.post("/{plan_id}/events")
async def submit_event(plan_id: str, event: EventRequest, background_tasks: BackgroundTasks):
    """
    Submit an execution event (e.g., Task Completed, KPI Updated).
    This triggers the Reactive Engine.
    """
    # Use background task for recomputation to keep API fast
    # strategy_service.log_event calls recompute, we can wrap it
    # For now, synchronous is safer to ensure immediate UI update on refresh
    try:
        strategy_service.log_event(plan_id, event.event_type, event.payload)
        return {"status": "processed", "plan_id": plan_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{plan_id}/state")
async def get_plan_state(plan_id: str):
    """
    Returns the FULL canonical state of the plan,
    computed from the Single Source of Truth.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # KPIs
    kpis = cursor.execute("SELECT * FROM plan_kpis WHERE plan_id = ?", (plan_id,)).fetchall()
    kpis_list = [dict(row) for row in kpis]
    
    # OKRs & KRs (Joined)
    # Simplified: Just fetch OKRs for now, assume KRs handled similarly
    okrs = cursor.execute("SELECT * FROM plan_okrs WHERE plan_id = ?", (plan_id,)).fetchall()
    okrs_list = [dict(row) for row in okrs]
    
    # Risks
    risks = cursor.execute("SELECT * FROM plan_risks WHERE plan_id = ?", (plan_id,)).fetchall()
    risks_list = [dict(row) for row in risks]
    
    # Sprints
    sprints = cursor.execute("SELECT * FROM plan_sprints WHERE plan_id = ?", (plan_id,)).fetchall()
    sprints_list = [dict(row) for row in sprints]
    
    # Computed Metrics
    computed = cursor.execute("SELECT * FROM computed_metrics WHERE plan_id = ?", (plan_id,)).fetchone()
    computed_dict = dict(computed) if computed else {}
    
    conn.close()
    
    return {
        "plan_id": plan_id,
        "kpis": kpis_list,
        "okrs": okrs_list,
        "risks": risks_list,
        "sprints": sprints_list,
        "computed": computed_dict
    }

@router.post("/{plan_id}/init")
async def init_plan_state(plan_id: str, payload: dict):
    """
    Initialize a plan's state in the DB from the frontend generator.
    Only used once when a plan is created/first loaded.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    exists = cursor.execute("SELECT 1 FROM plans WHERE id = ?", (plan_id,)).fetchone()
    if exists:
        conn.close()
        return {"status": "already_exists"}
        
    cursor.execute("INSERT INTO plans (id, title) VALUES (?, ?)", (plan_id, payload.get("title", "Untitled")))
    
    # Init KPIs
    for kpi in payload.get("kpis", []):
         cursor.execute("INSERT INTO plan_kpis (id, plan_id, name, value, target) VALUES (?, ?, ?, ?, ?)",
                        (kpi["id"], plan_id, kpi["name"], kpi["value"], kpi["target"]))
                        
    # Init Risks
    for risk in payload.get("risks", []):
         cursor.execute("INSERT INTO plan_risks (id, plan_id, description, impact, mitigation, resolved) VALUES (?, ?, ?, ?, ?, ?)",
                        (risk["id"], plan_id, risk["description"], risk["impact"], risk["mitigation"], 0))

    # Init Sprints
    for sprint in payload.get("sprints", []):
         cursor.execute("INSERT INTO plan_sprints (id, plan_id, week_number, goal, completed) VALUES (?, ?, ?, ?, ?)",
                        (sprint["id"], plan_id, sprint["weekNumber"], sprint["goal"], int(sprint["completed"])))

    conn.commit()
    conn.close()
    
    # Initial Recompute
    strategy_service.recompute_plan(plan_id)
    
    return {"status": "initialized"}
