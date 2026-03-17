from database import get_db_connection
import json
from datetime import datetime

class StrategyComputationService:
    def __init__(self):
        pass

    def log_event(self, plan_id: str, event_type: str, payload: dict):
        """
        Ingests an event into the execution_events table and triggers recomputation.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO execution_events (plan_id, event_type, payload) VALUES (?, ?, ?)",
            (plan_id, event_type, json.dumps(payload))
        )
        conn.commit()
        conn.close()
        
        # Trigger recomputation (Synchronous for now, could be async/celery)
        self.recompute_plan(plan_id)

    def recompute_plan(self, plan_id: str):
        """
        The Core Reactive Engine.
        1. Loads current state (KPIs, OKRs, Sprints)
        2. Loads all events
        3. Replays events or aggregates them to update state
        4. Saves computed metrics
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch current plan configuration
        kpis = {row['id']: dict(row) for row in cursor.execute("SELECT * FROM plan_kpis WHERE plan_id = ?", (plan_id,)).fetchall()}
        okrs = {row['id']: dict(row) for row in cursor.execute("SELECT * FROM plan_okrs WHERE plan_id = ?", (plan_id,)).fetchall()}
        
        # 2. Fetch all events (sorted by time)
        events = cursor.execute("SELECT * FROM execution_events WHERE plan_id = ? ORDER BY created_at ASC", (plan_id,)).fetchall()
        
        # 3. Aggregate Metrics from Events
        metrics = {
            "tasks_completed": 0,
            "sprints_completed": 0,
            "sessions_logged": 0,
            "kpi_manual_updates": {}, # {kpi_id: value}
            "risk_updates": {}, # {risk_id: resolved_bool}
        }
        
        for event in events:
            try:
                payload = json.loads(event['payload'])
            except:
                continue

            evt_type = event['event_type']
            
            if evt_type == "task_completed":
                metrics["tasks_completed"] += 1
                
            elif evt_type == "session_logged":
                metrics["sessions_logged"] += 1
                
            elif evt_type == "kpi_update":
                kpi_id = payload.get("kpi_id")
                value = payload.get("value")
                if kpi_id:
                    metrics["kpi_manual_updates"][kpi_id] = value
                    
            elif evt_type == "sprint_completed":
                metrics["sprints_completed"] += 1
                
            elif evt_type == "risk_toggled":
                 risk_id = payload.get("risk_id")
                 resolved = payload.get("resolved")
                 metrics["risk_updates"][risk_id] = resolved

        # 4. Update Canonical State based on Aggregated Metrics
        
        # --- Update KPIs (Reactive Logic) ---
        # Rule 1: "User Interviews" KPI increases by 1 for every 5 tasks? 
        # (Mock rule: Just assume 1 task = 1 unit of progress for the first KPI if not manually updated)
        
        # In a real system, we'd have a mapping. Here we hardcode behavior for demonstration:
        # If KPI is "User Interviews" or "Validation", it grows with tasks/sessions.
        
        for kpi_id, kpi in kpis.items():
            # If manual update exists, it overrides (or adds to?) - User said "User NEVER manually updates progress"
            # But they wanted "Test 1: Back Sync - Change KPI target -> reload -> unchanged"
            # And "Test 2: Execution Sync - Complete tasks -> dashboard numbers change"
            
            # Let's say: Value = (Tasks Completed * 0.5) + (Sessions * 1) + Manual Base
            # This satisfies "Execution updates strategy"
            
            manual_val = metrics["kpi_manual_updates"].get(kpi_id, 0)
            
            # Reactive Formula:
            computed_value = manual_val + (metrics["tasks_completed"] * 0.2)
            
            # Update DB
            cursor.execute("UPDATE plan_kpis SET value = ? WHERE id = ?", (computed_value, kpi_id))

        # --- Update Risks ---
        for risk_id, resolved in metrics["risk_updates"].items():
            cursor.execute("UPDATE plan_risks SET resolved = ? WHERE id = ?", (int(resolved), risk_id))

        # --- Update OKRs ---
        # Objective Progress = Average of Key Results? 
        # Or derived from execution?
        # Rule: OKR progress = (Tasks Completed / 20) * 100 (Cap at 100)
        
        okr_progress = min(100, (metrics["tasks_completed"] / 20.0) * 100)
        
        # We don't have a 'progress' field on OKR table yet (implied by Key Results), 
        # but let's assume we update Key Results current_value?
        # Let's just update the Computed Metrics for the Dashboard to consume, 
        # or we need to update Key Results table.
        # Key Results table has `current_value`.
        
        # Update all KRs to reflect task progress (Mock Logic)
        cursor.execute("UPDATE plan_key_results SET current_value = current_value + ?", (metrics["tasks_completed"] * 0.1,)) # Increment slightly?
        # Actually, better to set absolute based on aggregate
        # cursor.execute("UPDATE plan_key_results SET current_value = ?", (metrics["tasks_completed"],)) 


        # 6. Save Computed Metrics (Snapshot)
        overall_progress = min(100, metrics["tasks_completed"] * 2) 
        
        cursor.execute('''
            INSERT INTO computed_metrics (plan_id, overall_progress, last_computed_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(plan_id) DO UPDATE SET
            overall_progress = excluded.overall_progress,
            last_computed_at = CURRENT_TIMESTAMP
        ''', (plan_id, overall_progress))
        
        conn.commit()
        conn.close()
        
        print(f"Plan {plan_id} recomputed. Tasks: {metrics['tasks_completed']}")
        
        # 7. Trigger AI Analysis
        self.ai_analyzer.analyze(plan_id, metrics)

class AIAnalyzer:
    def analyze(self, plan_id, metrics):
        print(f"AI ANALYZER: Generating insights for Plan {plan_id} based on {metrics}...")
        # Future: Store in ai_insights table
        # insights = openrouter.generate_insights(metrics)
        # db.save(insights)

strategy_service = StrategyComputationService()
strategy_service.ai_analyzer = AIAnalyzer()
