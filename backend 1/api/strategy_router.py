from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from database import get_db_connection
from services.strategy import strategy_service
from api.openrouter import generate_strategy_analysis


router = APIRouter(prefix="/strategy", tags=["strategy"])


class EventRequest(BaseModel):
    event_type: str = Field(min_length=1)
    payload: dict = Field(default_factory=dict)


class StateResponse(BaseModel):
    plan_id: str
    kpis: List[dict]
    okrs: List[dict]
    key_results: List[dict]
    risks: List[dict]
    sprints: List[dict]
    assumptions: List[dict]
    computed: dict


def _fetch_plan_state(plan_id: str):
    conn = get_db_connection()

    try:
        cursor = conn.cursor()

        # ---------------------------------------------------------
        # PLAN
        # ---------------------------------------------------------
        plan = cursor.execute(
            "SELECT * FROM plans WHERE id = ?",
            (plan_id,),
        ).fetchone()

        if not plan:
            raise HTTPException(
                status_code=404,
                detail="Plan not found",
            )

        # ---------------------------------------------------------
        # KPIs
        # ---------------------------------------------------------
        kpis = [
            dict(row)
            for row in cursor.execute(
                "SELECT * FROM plan_kpis WHERE plan_id = ?",
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # OKRs
        # ---------------------------------------------------------
        okrs = [
            dict(row)
            for row in cursor.execute(
                "SELECT * FROM plan_okrs WHERE plan_id = ?",
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # KEY RESULTS
        # ---------------------------------------------------------
        key_results = [
            dict(row)
            for row in cursor.execute(
                """
                SELECT kr.*
                FROM plan_key_results kr
                JOIN plan_okrs o
                    ON o.id = kr.okr_id
                WHERE o.plan_id = ?
                """,
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # RISKS
        # ---------------------------------------------------------
        risks = [
            dict(row)
            for row in cursor.execute(
                "SELECT * FROM plan_risks WHERE plan_id = ?",
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # SPRINTS
        # ---------------------------------------------------------
        sprints = [
            dict(row)
            for row in cursor.execute(
                "SELECT * FROM plan_sprints WHERE plan_id = ?",
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # ASSUMPTIONS
        # ---------------------------------------------------------
        assumptions = [
            dict(row)
            for row in cursor.execute(
                "SELECT * FROM plan_assumptions WHERE plan_id = ?",
                (plan_id,),
            ).fetchall()
        ]

        # ---------------------------------------------------------
        # COMPUTED METRICS
        # ---------------------------------------------------------
        computed = cursor.execute(
            "SELECT * FROM computed_metrics WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()

        return {
            "plan_id": plan_id,
            "title": plan["title"],
            "summary": plan["summary"],
            "kpis": kpis,
            "okrs": okrs,
            "key_results": key_results,
            "risks": risks,
            "sprints": sprints,
            "assumptions": assumptions,
            "computed": dict(computed) if computed else {},
        }

    finally:
        conn.close()


# ================================================================
# EVENT API
# ================================================================

@router.post("/{plan_id}/events")
async def submit_event(
    plan_id: str,
    event: EventRequest,
):
    """
    Record an execution event and recompute the plan state.
    """

    try:
        strategy_service.log_event(
            plan_id,
            event.event_type,
            event.payload,
        )

        return {
            "status": "processed",
            "plan_id": plan_id,
            "event_type": event.event_type,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ================================================================
# STATE API
# ================================================================

@router.get(
    "/{plan_id}/state",
    response_model=StateResponse,
)
async def get_plan_state(plan_id: str):
    """
    Return the current canonical state of a plan.
    """

    state = _fetch_plan_state(plan_id)

    return state


# ================================================================
# AI STRATEGY ANALYSIS
# ================================================================

@router.get("/{plan_id}/ai-analysis")
async def get_ai_strategy_analysis(plan_id: str):
    """
    Generate a fresh AI interpretation of the current
    canonical strategy state.

    AI analysis does NOT directly modify the database.
    """

    state = _fetch_plan_state(plan_id)

    try:
        analysis = await generate_strategy_analysis(state)

        return {
            "plan_id": plan_id,
            "ai_strategy": analysis,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.post("/{plan_id}/ai-analysis")
async def post_ai_strategy_analysis(plan_id: str):
    """
    POST version of the AI strategy analysis endpoint.
    """

    return await get_ai_strategy_analysis(plan_id)


# ================================================================
# INITIALIZE PLAN
# ================================================================

@router.post("/{plan_id}/init")
async def init_plan_state(
    plan_id: str,
    payload: dict,
):
    """
    Initialize a new strategy plan and its related entities.
    """

    conn = get_db_connection()

    try:
        cursor = conn.cursor()

        # ---------------------------------------------------------
        # CHECK IF PLAN ALREADY EXISTS
        # ---------------------------------------------------------
        exists = cursor.execute(
            "SELECT 1 FROM plans WHERE id = ?",
            (plan_id,),
        ).fetchone()

        if exists:
            return {
                "status": "already_exists",
                "plan_id": plan_id,
            }

        # ---------------------------------------------------------
        # CREATE PLAN
        # ---------------------------------------------------------
        cursor.execute(
            """
            INSERT INTO plans (
                id,
                title,
                summary
            )
            VALUES (?, ?, ?)
            """,
            (
                plan_id,
                payload.get("title", "Untitled"),
                payload.get("summary"),
            ),
        )

        # ---------------------------------------------------------
        # CREATE KPIs
        # ---------------------------------------------------------
        for kpi in payload.get("kpis", []):

            cursor.execute(
                """
                INSERT INTO plan_kpis (
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
                    kpi.get("name", ""),
                    kpi.get("value", 0),
                    kpi.get("target", 0),
                ),
            )

        # ---------------------------------------------------------
        # CREATE OKRs + KEY RESULTS
        # ---------------------------------------------------------
        for okr in payload.get("okrs", []):

            okr_id = okr["id"]

            cursor.execute(
                """
                INSERT INTO plan_okrs (
                    id,
                    plan_id,
                    objective
                )
                VALUES (?, ?, ?)
                """,
                (
                    okr_id,
                    plan_id,
                    okr.get(
                        "objective",
                        okr.get("title", ""),
                    ),
                ),
            )

            key_results = okr.get(
                "key_results",
                okr.get("keyResults", []),
            )

            for kr in key_results:

                cursor.execute(
                    """
                    INSERT INTO plan_key_results (
                        id,
                        okr_id,
                        title,
                        target_value,
                        current_value
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        kr["id"],
                        okr_id,
                        kr.get("title", ""),
                        kr.get(
                            "target_value",
                            kr.get("target", 0),
                        ),
                        kr.get(
                            "current_value",
                            kr.get("currentValue", 0),
                        ),
                    ),
                )

        # ---------------------------------------------------------
        # CREATE RISKS
        # ---------------------------------------------------------
        for risk in payload.get("risks", []):

            cursor.execute(
                """
                INSERT INTO plan_risks (
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
                    risk.get("description", ""),
                    risk.get("impact", ""),
                    risk.get("mitigation", ""),
                    int(risk.get("resolved", False)),
                ),
            )

        # ---------------------------------------------------------
        # CREATE SPRINTS
        # ---------------------------------------------------------
        for sprint in payload.get("sprints", []):

            cursor.execute(
                """
                INSERT INTO plan_sprints (
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
                        sprint.get("week_number", 0),
                    ),
                    sprint.get("goal", ""),
                    int(sprint.get("completed", False)),
                ),
            )

        # ---------------------------------------------------------
        # CREATE ASSUMPTIONS
        # ---------------------------------------------------------
        for assumption in payload.get(
            "assumptions",
            [],
        ):

            cursor.execute(
                """
                INSERT INTO plan_assumptions (
                    id,
                    plan_id,
                    statement,
                    validated,
                    notes
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    assumption["id"],
                    plan_id,
                    assumption.get("statement", ""),
                    int(
                        assumption.get(
                            "validated",
                            False,
                        )
                    ),
                    assumption.get("notes"),
                ),
            )

        # ---------------------------------------------------------
        # COMMIT
        # ---------------------------------------------------------
        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

    # -------------------------------------------------------------
    # COMPUTE INITIAL STRATEGY STATE
    # -------------------------------------------------------------
    strategy_service.recompute_plan(plan_id)

    return {
        "status": "initialized",
        "plan_id": plan_id,
    }
