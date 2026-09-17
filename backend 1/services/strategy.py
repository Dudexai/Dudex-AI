from database import get_db_connection
import json


class StrategyComputationService:
    """
    Deterministic execution engine.

    Database state is the source of truth.
    AI is used only for interpretation/recommendations.
    """

    def log_event(self, plan_id: str, event_type: str, payload: dict):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            plan_exists = cursor.execute(
                "SELECT 1 FROM plans WHERE id = ?", (plan_id,)
            ).fetchone()

            if not plan_exists:
                raise ValueError(f"Plan '{plan_id}' does not exist.")

            cursor.execute(
                """
                INSERT INTO execution_events
                (plan_id, event_type, payload)
                VALUES (?, ?, ?)
                """,
                (plan_id, event_type, json.dumps(payload)),
            )
            conn.commit()
        finally:
            conn.close()

        self.recompute_plan(plan_id)

    def recompute_plan(self, plan_id: str):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            plan = cursor.execute(
                "SELECT * FROM plans WHERE id = ?", (plan_id,)
            ).fetchone()

            if not plan:
                raise ValueError(f"Plan '{plan_id}' does not exist.")

            kpis = cursor.execute(
                "SELECT * FROM plan_kpis WHERE plan_id = ?", (plan_id,)
            ).fetchall()

            events = cursor.execute(
                """
                SELECT * FROM execution_events
                WHERE plan_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (plan_id,),
            ).fetchall()

            metrics = {
                "tasks_completed": 0,
                "sprints_completed": 0,
                "sessions_logged": 0,
                "kpi_manual_updates": {},
                "risk_updates": {},
                "total_events": len(events),
            }

            for event in events:
                try:
                    payload = json.loads(event["payload"] or "{}")
                except (TypeError, json.JSONDecodeError):
                    payload = {}

                event_type = event["event_type"]

                if event_type == "task_completed":
                    metrics["tasks_completed"] += 1

                elif event_type == "session_logged":
                    metrics["sessions_logged"] += 1

                elif event_type == "sprint_completed":
                    metrics["sprints_completed"] += 1

                elif event_type == "kpi_update":
                    kpi_id = payload.get("kpi_id")
                    value = payload.get("value")
                    if kpi_id and value is not None:
                        try:
                            metrics["kpi_manual_updates"][kpi_id] = float(value)
                        except (TypeError, ValueError):
                            pass

                elif event_type == "risk_toggled":
                    risk_id = payload.get("risk_id")
                    if risk_id and "resolved" in payload:
                        metrics["risk_updates"][risk_id] = bool(
                            payload["resolved"]
                        )

            # KPIs: manual value is authoritative when supplied.
            # Otherwise derive a bounded progress value from execution activity.
            for kpi in kpis:
                kpi_id = kpi["id"]

                if kpi_id in metrics["kpi_manual_updates"]:
                    computed_value = metrics["kpi_manual_updates"][kpi_id]
                else:
                    computed_value = (
                        metrics["tasks_completed"] * 0.2
                        + metrics["sessions_logged"]
                    )

                target = kpi["target"]
                if target is not None:
                    try:
                        computed_value = min(float(computed_value), float(target))
                    except (TypeError, ValueError):
                        pass

                cursor.execute(
                    "UPDATE plan_kpis SET value = ? WHERE id = ?",
                    (computed_value, kpi_id),
                )

            # Risk changes come directly from explicit events.
            for risk_id, resolved in metrics["risk_updates"].items():
                cursor.execute(
                    "UPDATE plan_risks SET resolved = ? WHERE id = ?",
                    (int(resolved), risk_id),
                )

            # Avoid repeatedly incrementing KRs on every recomputation.
            # Derive current_value from completed tasks and target where possible.
            key_results = cursor.execute(
                """
                SELECT kr.id, kr.target_value
                FROM plan_key_results kr
                JOIN plan_okrs o ON o.id = kr.okr_id
                WHERE o.plan_id = ?
                """,
                (plan_id,),
            ).fetchall()

            for kr in key_results:
                target = kr["target_value"]
                if target is not None:
                    try:
                        current = min(
                            float(metrics["tasks_completed"]),
                            float(target),
                        )
                    except (TypeError, ValueError):
                        current = float(metrics["tasks_completed"])
                else:
                    current = float(metrics["tasks_completed"])

                cursor.execute(
                    "UPDATE plan_key_results SET current_value = ? WHERE id = ?",
                    (current, kr["id"]),
                )

            # Overall progress is a deterministic execution metric.
            overall_progress = min(
                100.0,
                metrics["tasks_completed"] * 2.0
                + metrics["sprints_completed"] * 10.0,
            )

            cursor.execute(
                """
                INSERT INTO computed_metrics
                (plan_id, overall_progress, last_computed_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(plan_id) DO UPDATE SET
                    overall_progress = excluded.overall_progress,
                    last_computed_at = CURRENT_TIMESTAMP
                """,
                (plan_id, overall_progress),
            )

            conn.commit()

            print(
                f"Plan {plan_id} recomputed. "
                f"Tasks: {metrics['tasks_completed']}, "
                f"Sprints: {metrics['sprints_completed']}"
            )

            return metrics

        finally:
            conn.close()


strategy_service = StrategyComputationService()
