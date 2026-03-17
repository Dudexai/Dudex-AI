from database import get_db_connection
import json

def get_report_data(plan_id: str):
    """
    Aggregates real execution and strategic data from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Fetch Plan Summary
        plan = cursor.execute("SELECT * FROM plans WHERE id = ?", (plan_id,)).fetchone()
        if not plan:
            return None
        
        # 2. Fetch KPIs
        kpis = cursor.execute("SELECT * FROM plan_kpis WHERE plan_id = ?", (plan_id,)).fetchall()
        kpis_list = [dict(row) for row in kpis]

        # 3. Fetch OKRs and Key Results
        okrs = cursor.execute("SELECT * FROM plan_okrs WHERE plan_id = ?", (plan_id,)).fetchall()
        okrs_list = []
        for okr_row in okrs:
            okr_dict = dict(okr_row)
            krs = cursor.execute("SELECT * FROM plan_key_results WHERE okr_id = ?", (okr_dict['id'],)).fetchall()
            okr_dict['key_results'] = [dict(row) for row in krs]
            okrs_list.append(okr_dict)

        # 4. Fetch Sprints
        sprints = cursor.execute("SELECT * FROM plan_sprints WHERE plan_id = ? ORDER BY week_number", (plan_id,)).fetchall()
        sprints_list = [dict(row) for row in sprints]

        # 5. Fetch Risks
        risks = cursor.execute("SELECT * FROM plan_risks WHERE plan_id = ?", (plan_id,)).fetchall()
        risks_list = [dict(row) for row in risks]

        # 6. Fetch Assumptions
        assumptions = cursor.execute("SELECT * FROM plan_assumptions WHERE plan_id = ?", (plan_id,)).fetchall()
        assumptions_list = [dict(row) for row in assumptions]

        # 7. Execution Stats (from events)
        events = cursor.execute("SELECT event_type FROM execution_events WHERE plan_id = ?", (plan_id,)).fetchall()
        task_events = [e for e in events if e['event_type'] == 'task_completed']
        tasks_completed = len(task_events)

        # 8. Computed Metrics
        computed = cursor.execute("SELECT * FROM computed_metrics WHERE plan_id = ?", (plan_id,)).fetchone()
        overall_progress = computed['overall_progress'] if (computed and 'overall_progress' in computed.keys()) else 0

        # Structure the summary object
        summary = {
            "title": plan['title'] or "Untitled Startup",
            "summary": plan['summary'] or "No summary provided.",
            "execution": {
                "tasks_completed": tasks_completed,
                "overall_progress": overall_progress,
                "is_pre_validation": tasks_completed == 0
            },
            "strategy": {
                "kpis": kpis_list or [],
                "okrs": okrs_list or [],
                "sprints": sprints_list or [],
                "risks": risks_list or [],
                "assumptions": assumptions_list or []
            },
            "metadata": {
                "generated_at": plan['last_updated'] or "N/A"
            }
        }

        return summary
    except Exception as e:
        print(f"ERROR in report_generator: {str(e)}")
        # Return a minimal valid structure to prevent further downstream crashes
        return {
            "title": "Error Processing Data",
            "summary": "Internal error during data aggregation.",
            "execution": {"tasks_completed": 0, "overall_progress": 0, "is_pre_validation": True},
            "strategy": {"kpis": [], "okrs": [], "sprints": [], "risks": [], "assumptions": []},
            "metadata": {"generated_at": "N/A", "error": str(e)}
        }
    finally:
        conn.close()
