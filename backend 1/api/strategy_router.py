from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Any
from services.strategy import strategy_service
from database import get_db_connection
from services.api_openrouter import generate_chat_response
import json
import asyncio
import traceback


router = APIRouter(
    prefix="/strategy",
    tags=["strategy"]
)


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

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
    ai_strategy: Optional[dict] = None


class AIAnalysisRequest(BaseModel):
    include_recommendations: bool = True
    include_risk_analysis: bool = True
    include_next_actions: bool = True


# ============================================================
# SAFE JSON PARSER
# ============================================================

def parse_ai_json(content: str) -> dict:
    """
    Safely parse AI JSON responses.

    Handles cases where the model accidentally wraps JSON
    inside markdown code fences.
    """

    if not content:
        return {}

    content = content.strip()

    # Remove markdown fences
    if content.startswith("```json"):
        content = content[7:]

    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    # Normal JSON parsing
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object
    start = content.find("{")
    end = content.rfind("}")

    if start != -1 and end != -1 and end > start:

        possible_json = content[start:end + 1]

        try:
            return json.loads(possible_json)
        except json.JSONDecodeError:
            pass

    return {}


# ============================================================
# GET PLAN DATA
# ============================================================

def fetch_plan_data(plan_id: str):
    """
    Fetch the complete current strategy state from DB.
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        # ----------------------------------------------------
        # PLAN
        # ----------------------------------------------------

        plan = cursor.execute(
            "SELECT * FROM plans WHERE id = ?",
            (plan_id,)
        ).fetchone()

        if not plan:
            return None

        plan_dict = dict(plan)

        # ----------------------------------------------------
        # KPIs
        # ----------------------------------------------------

        kpis = cursor.execute(
            """
            SELECT *
            FROM plan_kpis
            WHERE plan_id = ?
            """,
            (plan_id,)
        ).fetchall()

        kpis_list = [
            dict(row)
            for row in kpis
        ]

        # ----------------------------------------------------
        # OKRs
        # ----------------------------------------------------

        okrs = cursor.execute(
            """
            SELECT *
            FROM plan_okrs
            WHERE plan_id = ?
            """,
            (plan_id,)
        ).fetchall()

        okrs_list = [
            dict(row)
            for row in okrs
        ]

        # ----------------------------------------------------
        # RISKS
        # ----------------------------------------------------

        risks = cursor.execute(
            """
            SELECT *
            FROM plan_risks
            WHERE plan_id = ?
            """,
            (plan_id,)
        ).fetchall()

        risks_list = [
            dict(row)
            for row in risks
        ]

        # ----------------------------------------------------
        # SPRINTS
        # ----------------------------------------------------

        sprints = cursor.execute(
            """
            SELECT *
            FROM plan_sprints
            WHERE plan_id = ?
            """,
            (plan_id,)
        ).fetchall()

        sprints_list = [
            dict(row)
            for row in sprints
        ]

        # ----------------------------------------------------
        # COMPUTED METRICS
        # ----------------------------------------------------

        computed = cursor.execute(
            """
            SELECT *
            FROM computed_metrics
            WHERE plan_id = ?
            """,
            (plan_id,)
        ).fetchone()

        computed_dict = (
            dict(computed)
            if computed
            else {}
        )

        return {
            "plan": plan_dict,
            "kpis": kpis_list,
            "okrs": okrs_list,
            "risks": risks_list,
            "sprints": sprints_list,
            "computed": computed_dict
        }

    finally:
        conn.close()


# ============================================================
# AI STRATEGY ANALYSIS
# ============================================================

async def generate_ai_strategy(plan_data: dict):
    """
    Ask the AI to analyze the current strategy state.

    The AI does NOT directly modify the database.
    It only produces recommendations.
    """

    plan = plan_data.get("plan", {})
    kpis = plan_data.get("kpis", [])
    okrs = plan_data.get("okrs", [])
    risks = plan_data.get("risks", [])
    sprints = plan_data.get("sprints", [])
    computed = plan_data.get("computed", {})

    system_prompt = """
You are the DudeX AI Strategy Engine.

You are an expert startup strategist, product manager,
business analyst and execution coach.

Your task is to analyze a project's CURRENT execution state
and provide practical strategy recommendations.

You are NOT allowed to invent project facts.

Only use the information supplied in the project data.

Do not give generic recommendations.

Every recommendation must be connected to:

- KPI performance
- OKR progress
- sprint progress
- project risks
- computed metrics
- execution events
- project status

Your job is to identify:

1. What is going well
2. What is falling behind
3. What needs immediate attention
4. What risks are emerging
5. What the team should do next
6. Which metrics need improvement
7. Which objectives need attention
8. How the upcoming sprint should be approached

IMPORTANT:

Do not change data yourself.

Do not claim that an action has been completed.

Recommendations are suggestions only.

Return ONLY valid JSON.

Use this structure:

{
    "overall_status": "string",

    "summary": "string",

    "health": {
        "execution": "good|attention|critical",
        "kpis": "good|attention|critical",
        "objectives": "good|attention|critical",
        "risks": "good|attention|critical",
        "sprints": "good|attention|critical"
    },

    "strengths": [
        "specific observation"
    ],

    "attention_needed": [
        {
            "area": "string",
            "issue": "specific issue",
            "reason": "why it matters",
            "priority": "high|medium|low"
        }
    ],

    "recommendations": [
        {
            "title": "specific recommendation",
            "reason": "why this should be done",
            "priority": "high|medium|low",
            "action": "specific action"
        }
    ],

    "risk_analysis": [
        {
            "risk": "specific risk",
            "severity": "high|medium|low",
            "reason": "specific reason",
            "mitigation": "specific mitigation"
        }
    ],

    "next_actions": [
        {
            "action": "specific action",
            "priority": "high|medium|low",
            "expected_result": "specific result"
        }
    ],

    "kpi_insights": [
        {
            "kpi": "KPI name",
            "observation": "specific observation",
            "action": "recommended action"
        }
    ],

    "sprint_insights": [
        {
            "sprint": "sprint identifier",
            "observation": "specific observation",
            "action": "recommended action"
        }
    ]
}

Rules:

- Do not use filler.
- Do not repeat recommendations.
- Do not say "follow standard practices".
- Do not say "continue working".
- Do not say "monitor progress" without explaining what
  specifically should be monitored and why.
- Give concrete actions.
"""


    user_prompt = f"""
Analyze this project's current strategy state.

PROJECT:
{json.dumps(plan, ensure_ascii=False, default=str)}

KPIs:
{json.dumps(kpis, ensure_ascii=False, default=str)}

OKRs:
{json.dumps(okrs, ensure_ascii=False, default=str)}

RISKS:
{json.dumps(risks, ensure_ascii=False, default=str)}

SPRINTS:
{json.dumps(sprints, ensure_ascii=False, default=str)}

COMPUTED METRICS:
{json.dumps(computed, ensure_ascii=False, default=str)}

Provide a practical strategy analysis based ONLY on this data.
"""


    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_prompt
        }
    ]

    try:

        response = await generate_chat_response(
            messages,
            max_tokens=5000
        )

        parsed = parse_ai_json(response)

        if not parsed:
            return {
                "overall_status": "attention",
                "summary": (
                    "AI analysis could not be parsed."
                ),
                "health": {},
                "strengths": [],
                "attention_needed": [],
                "recommendations": [],
                "risk_analysis": [],
                "next_actions": [],
                "kpi_insights": [],
                "sprint_insights": []
            }

        return parsed

    except Exception as e:

        print(
            f"AI Strategy Error: {e}"
        )

        traceback.print_exc()

        return {
            "overall_status": "unavailable",
            "summary":
                "AI strategy analysis is temporarily unavailable.",

            "health": {},

            "strengths": [],

            "attention_needed": [],

            "recommendations": [],

            "risk_analysis": [],

            "next_actions": [],

            "kpi_insights": [],

            "sprint_insights": []
        }


# ============================================================
# SUBMIT EXECUTION EVENT
# ============================================================

@router.post("/{plan_id}/events")
async def submit_event(
    plan_id: str,
    event: EventRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit an execution event.

    Example:

    {
        "event_type": "task_completed",
        "payload": {
            "task_id": "task-1",
            "name": "Build login page"
        }
    }

    The deterministic strategy engine processes the event.

    AI analysis is then refreshed in the background.
    """

    try:

        # ----------------------------------------------------
        # Verify plan exists
        # ----------------------------------------------------

        plan_data = fetch_plan_data(plan_id)

        if not plan_data:

            raise HTTPException(
                status_code=404,
                detail="Plan not found."
            )

        # ----------------------------------------------------
        # Process event
        # ----------------------------------------------------

        strategy_service.log_event(
            plan_id,
            event.event_type,
            event.payload
        )

        # ----------------------------------------------------
        # Re-fetch state after event
        # ----------------------------------------------------

        updated_data = fetch_plan_data(
            plan_id
        )

        # ----------------------------------------------------
        # Background AI analysis
        # ----------------------------------------------------

        async def update_ai():

            try:

                analysis = await generate_ai_strategy(
                    updated_data
                )

                print(
                    f"DEBUG: AI strategy refreshed "
                    f"for plan {plan_id}"
                )

                # AI analysis is intentionally not written
                # to the DB here because your existing schema
                # does not show an ai_strategy column.

            except Exception as e:

                print(
                    f"Background AI error: {e}"
                )

        background_tasks.add_task(
            update_ai
        )

        return {
            "status": "processed",
            "plan_id": plan_id,
            "event_type": event.event_type,
            "ai_analysis": "queued"
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"Event Processing Error: {e}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GET PLAN STATE
# ============================================================

@router.get(
    "/{plan_id}/state",
    response_model=StateResponse
)
async def get_plan_state(
    plan_id: str
):
    """
    Returns the complete canonical state of a plan.

    This includes:

    - KPIs
    - OKRs
    - Risks
    - Sprints
    - Computed metrics
    """

    try:

        plan_data = fetch_plan_data(
            plan_id
        )

        if not plan_data:

            raise HTTPException(
                status_code=404,
                detail="Plan not found."
            )

        return {
            "plan_id": plan_id,

            "kpis":
                plan_data["kpis"],

            "okrs":
                plan_data["okrs"],

            "risks":
                plan_data["risks"],

            "sprints":
                plan_data["sprints"],

            "computed":
                plan_data["computed"],

            "ai_strategy":
                None
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"State Fetch Error: {e}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# GET AI STRATEGY ANALYSIS
# ============================================================

@router.get("/{plan_id}/ai-analysis")
async def get_ai_strategy_analysis(
    plan_id: str
):
    """
    Generate a fresh AI analysis of the current plan.
    """

    try:

        plan_data = fetch_plan_data(
            plan_id
        )

        if not plan_data:

            raise HTTPException(
                status_code=404,
                detail="Plan not found."
            )

        analysis = await generate_ai_strategy(
            plan_data
        )

        return {
            "status": "success",
            "plan_id": plan_id,
            "analysis": analysis
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"AI Analysis Error: {e}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Unable to generate AI strategy analysis."
        )


# ============================================================
# POST AI STRATEGY ANALYSIS
# ============================================================

@router.post("/{plan_id}/ai-analysis")
async def refresh_ai_strategy(
    plan_id: str,
    request: AIAnalysisRequest
):
    """
    Explicitly generate a new AI strategy analysis.

    This can be called from a frontend button such as:

    "Analyze Strategy"
    "Get AI Recommendations"
    "Refresh AI Insights"
    """

    try:

        plan_data = fetch_plan_data(
            plan_id
        )

        if not plan_data:

            raise HTTPException(
                status_code=404,
                detail="Plan not found."
            )

        analysis = await generate_ai_strategy(
            plan_data
        )

        return {
            "status": "success",
            "plan_id": plan_id,
            "analysis": analysis
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"AI Strategy Refresh Error: {e}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Unable to generate AI strategy."
        )


# ============================================================
# INITIALIZE PLAN
# ============================================================

@router.post("/{plan_id}/init")
async def init_plan_state(
    plan_id: str,
    payload: dict
):
    """
    Initialize a plan's strategy state.

    This is normally called once when a plan is created.
    """

    conn = get_db_connection()
    cursor = conn.cursor()

    try:

        # ----------------------------------------------------
        # CHECK EXISTING PLAN
        # ----------------------------------------------------

        exists = cursor.execute(
            """
            SELECT 1
            FROM plans
            WHERE id = ?
            """,
            (plan_id,)
        ).fetchone()

        if exists:

            return {
                "status": "already_exists",
                "plan_id": plan_id
            }

        # ----------------------------------------------------
        # CREATE PLAN
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO plans
            (id, title)
            VALUES (?, ?)
            """,
            (
                plan_id,
                payload.get(
                    "title",
                    "Untitled"
                )
            )
        )

        # ----------------------------------------------------
        # KPIs
        # ----------------------------------------------------

        for kpi in payload.get(
            "kpis",
            []
        ):

            cursor.execute(
                """
                INSERT INTO plan_kpis
                (
                    id,
                    plan_id,
                    name,
                    value,
                    target
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    kpi["id"],
                    plan_id,
                    kpi["name"],
                    kpi.get("value", 0),
                    kpi.get("target", 0)
                )
            )

        # ----------------------------------------------------
        # OKRs
        # ----------------------------------------------------

        for okr in payload.get(
            "okrs",
            []
        ):

            # Only insert if your database contains
            # these expected fields.

            try:

                cursor.execute(
                    """
                    INSERT INTO plan_okrs
                    (id, plan_id, objective)
                    VALUES (?, ?, ?)
                    """,
                    (
                        okr["id"],
                        plan_id,
                        okr.get(
                            "objective",
                            okr.get(
                                "name",
                                "Untitled Objective"
                            )
                        )
                    )
                )

            except Exception as e:

                print(
                    f"DEBUG: OKR insert skipped: {e}"
                )

        # ----------------------------------------------------
        # RISKS
        # ----------------------------------------------------

        for risk in payload.get(
            "risks",
            []
        ):

            cursor.execute(
                """
                INSERT INTO plan_risks
                (
                    id,
                    plan_id,
                    description,
                    impact,
                    mitigation,
                    resolved
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    risk["id"],
                    plan_id,
                    risk.get(
                        "description",
                        ""
                    ),
                    risk.get(
                        "impact",
                        ""
                    ),
                    risk.get(
                        "mitigation",
                        ""
                    ),
                    int(
                        risk.get(
                            "resolved",
                            False
                        )
                    )
                )
            )

        # ----------------------------------------------------
        # SPRINTS
        # ----------------------------------------------------

        for sprint in payload.get(
            "sprints",
            []
        ):

            cursor.execute(
                """
                INSERT INTO plan_sprints
                (
                    id,
                    plan_id,
                    week_number,
                    goal,
                    completed
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    sprint["id"],
                    plan_id,
                    sprint.get(
                        "weekNumber",
                        sprint.get(
                            "week_number",
                            1
                        )
                    ),
                    sprint.get(
                        "goal",
                        ""
                    ),
                    int(
                        sprint.get(
                            "completed",
                            False
                        )
                    )
                )
            )

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------

        conn.commit()

    except Exception as e:

        conn.rollback()

        print(
            f"Plan Initialization Error: {e}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        conn.close()

    # ========================================================
    # INITIAL DETERMINISTIC RECOMPUTATION
    # ========================================================

    try:

        strategy_service.recompute_plan(
            plan_id
        )

    except Exception as e:

        print(
            f"Initial recomputation error: {e}"
        )

    # ========================================================
    # GET INITIAL STATE
    # ========================================================

    try:

        plan_data = fetch_plan_data(
            plan_id
        )

        # ====================================================
        # INITIAL AI ANALYSIS
        # ====================================================

        ai_analysis = await generate_ai_strategy(
            plan_data
        )

    except Exception as e:

        print(
            f"Initial AI analysis error: {e}"
        )

        ai_analysis = {
            "overall_status":
                "unavailable",

            "summary":
                "AI analysis is temporarily unavailable.",

            "health": {},

            "strengths": [],

            "attention_needed": [],

            "recommendations": [],

            "risk_analysis": [],

            "next_actions": [],

            "kpi_insights": [],

            "sprint_insights": []
        }

    return {
        "status": "initialized",
        "plan_id": plan_id,
        "ai_analysis": ai_analysis
    }
