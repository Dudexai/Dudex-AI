import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")


def get_headers():
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://work.dudexai.com",
        "X-Title": "DudeX AI",
    }


async def call_openrouter(messages, max_tokens=5000, temperature=0.75):
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY is not configured.")

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers=get_headers(),
                json=payload,
            )

        print(f"DEBUG: OpenRouter status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise Exception("OpenRouter returned no choices.")

            msg = choices[0].get("message", {})
            content = msg.get("content")
            if not content:
                content = msg.get("reasoning")
            if not content:
                raise Exception("OpenRouter returned empty content.")

            return content

        if response.status_code == 429:
            print(response.text)
            raise Exception(
                "The free AI model is temporarily rate limited. Please try again shortly."
            )

        if response.status_code == 402:
            print(response.text)
            raise Exception("OpenRouter returned a credit/payment error.")

        print(f"DEBUG: OpenRouter error {response.status_code}:")
        print(response.text)
        raise Exception(f"OpenRouter API error {response.status_code}")

    except httpx.TimeoutException:
        raise Exception("OpenRouter request timed out. Please try again.")
    except httpx.RequestError as e:
        print(f"DEBUG: OpenRouter connection error: {e}")
        raise Exception("Unable to connect to OpenRouter.")


async def generate_startup_plan(startup_idea, days=30, user_goal=None, additional_context=None):
    print(f"DEBUG: Generating startup plan for: {startup_idea}")

    context_parts = [f"PROJECT IDEA:\n{startup_idea}", f"PLANNING PERIOD:\n{days} days"]

    if user_goal:
        context_parts.append(f"USER GOAL:\n{user_goal}")

    if additional_context:
        context_parts.append(f"ADDITIONAL CONTEXT:\n{additional_context}")

    messages = [
        {
            "role": "system",
            "content": """You are DudeX AI, an expert startup strategist and software architect.
Convert the user's idea into a structured, highly actionable startup execution plan.

You MUST respond with valid JSON ONLY. Do not include markdown code fences, conversational prose, or introductory text.
Your response MUST strictly adhere to this JSON format:
{
  "title": "<Startup Name>",
  "summary": "<2-3 sentence strategic executive summary>",
  "tasks": [
    {
      "title": "<Actionable task title>",
      "description": "<Specific instructions and guidance for this task>",
      "phase": "Validation",
      "day": 1
    }
  ],
  "kpis": [
    "<Key performance indicator 1>",
    "<Key performance indicator 2>",
    "<Key performance indicator 3>"
  ],
  "risks": [
    "<Risk factor 1 and mitigation>",
    "<Risk factor 2 and mitigation>"
  ]
}

Phase rules:
- Only use one of these four exact phase strings for each task: "Validation", "Build", "Launch", "Scale".
- Distribute tasks progressively across the total planning days.
- Ensure at least 8 to 15 concrete, high-impact tasks.""",
        },
        {
            "role": "user",
            "content": "\n\n".join(context_parts)
            + "\n\nGenerate the complete JSON startup plan now.",
        },
    ]

    return await call_openrouter(messages, max_tokens=5000, temperature=0.7)


async def generate_chat_response(context, message, max_tokens=3000):
    print("DEBUG: Generating chat response")

    messages = [
        {
            "role": "system",
            "content": """
You are DudeX AI, a helpful project and startup mentor.
Use the supplied project context when answering.
Give practical, clear and actionable answers.
Do not invent project facts that are not present in the context.
""",
        },
        {
            "role": "user",
            "content": f"PROJECT CONTEXT:\n{context}\n\nUSER MESSAGE:\n{message}",
        },
    ]

    return await call_openrouter(
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.75,
    )


def generate_domain_tailored_guide(task, context=None, phase=None, day=None):
    """
    Generates a high-quality, product-specific step-by-step guide
    tailored directly to the startup and task.
    """
    startup_name = "Your Startup"
    vision = ""
    if context:
        import re
        s_match = re.search(r"Startup:\s*([^.]+)", context)
        if s_match:
            startup_name = s_match.group(1).strip()
        v_match = re.search(r"Vision:\s*([^.]+)", context)
        if v_match:
            vision = v_match.group(1).strip()

    phase_name = phase or "Execution"
    day_num = day or 1

    return {
        "brief_explanation": f"{task} - Step-by-Step Strategic & Technical Execution Plan for {startup_name}",
        "description": f"A comprehensive tactical guide to execute '{task}' for {startup_name} during Phase '{phase_name}'. Tailored to accelerate milestones and eliminate operational bottlenecks.",
        "workflow": [
            {
                "step": 1,
                "title": f"Define Scope & Problem Hypotheses for {startup_name}",
                "details": f"Identify the exact bottlenecks and user workflows for {startup_name}. Formulate 3-5 concrete problem hypotheses relevant to '{task}' and verify them against target market realities.",
                "tools": ["User Interviews", "Notion", "Figma / Whimsical"],
                "example": f"Document top 3 operational challenges facing {startup_name}'s users (e.g. manual tracking, latency, error rates)."
            },
            {
                "step": 2,
                "title": f"Architect the Solution & Required Data Points",
                "details": f"Map out the exact data contracts, process flows, and component responsibilities required to execute '{task}' efficiently without technical debt.",
                "tools": ["Architecture Diagram", "Postman", "Schema Designer"],
                "example": "Define schemas, API payload structures, and deterministic validation rules."
            },
            {
                "step": 3,
                "title": "Build Core Implementation & Functional Artifacts",
                "details": f"Construct the foundational logic, automated workflows, and UI elements. Ensure error handling and edge cases are addressed upfront.",
                "tools": ["IDE / Editor", "Database / ORM", "Version Control"],
                "example": f"Complete the core functional modules for {startup_name} and verify with sample test datasets."
            },
            {
                "step": 4,
                "title": "Validate with Real User Scenarios & Performance Testing",
                "details": f"Run complete end-to-end user journeys simulating peak operational conditions for {startup_name}. Track response times, error rates, and user friction.",
                "tools": ["Unit & Integration Tests", "User Walkthroughs"],
                "example": "Conduct 3 realistic operational runs and verify that no critical failure states occur."
            },
            {
                "step": 5,
                "title": f"Synthesize Findings & Finalize Day {day_num} Milestone Deliverables",
                "details": f"Package the validated outputs, document key metrics, and prepare the project milestone review for {startup_name}.",
                "tools": ["DudeX Output Notes", "Execution Dashboard"],
                "example": "Record final findings, test reports, and deliverables in the output progress section."
            }
        ],
        "why_this_process": f"Executing '{task}' systematically ensures {startup_name} builds on validated data rather than assumptions, reducing rework and accelerating deployment.",
        "how_to_do_this": [
            f"Review the scope of '{task}' and align with {startup_name}'s vision.",
            "Complete the problem hypothesis and data architecture before writing code or making commitments.",
            "Implement the core workflows incrementally, testing each step with realistic test inputs.",
            "Engage real users or stakeholders to validate the implementation under peak conditions.",
            "Record all key outputs, learnings, and data in your DudeX execution progress notes."
        ],
        "tools_required": [
            {"name": "Execution Workspace", "purpose": "Track step completion and maintain delivery velocity."},
            {"name": "Data & API Client", "purpose": "Validate requests, payloads, and integration points."},
            {"name": "DudeX Progress Notes", "purpose": "Persist validated findings and output artifacts."}
        ],
        "expected_output": f"A thoroughly verified and documented execution output for '{task}' ready for Day {day_num} milestone completion.",
        "common_mistakes": [
            f"Building features without first validating the specific problem for {startup_name}.",
            "Skipping edge-case testing under realistic load or peak condition scenarios.",
            "Failing to record output findings and decisions in the project notes."
        ],
        "completion_checklist": [
            f"Hypotheses and requirements for '{task}' documented.",
            "Core technical or operational workflows implemented and validated.",
            "Execution output saved and verified against Day milestone goals."
        ],
        "guidance_links": [],
        "suitable_links": []
    }


async def generate_task_guide(task, context=None, phase=None, day=None):
    print(f"DEBUG: Generating guide for task: {task}")

    context_text = ""
    if context:
        context_text += f"\nPROJECT CONTEXT:\n{context}"
    if phase:
        context_text += f"\nPHASE:\n{phase}"
    if day is not None:
        context_text += f"\nDAY:\n{day}"

    system_prompt = """
You are DudeX AI, an expert technical mentor, software developer,
startup advisor, researcher and project instructor.

Take ONE specific task and explain exactly how to complete it.

The guide must be:
- specific to the task
- practical and actionable
- understandable to beginners
- technically useful
- free of filler and repetition

For technical tasks include relevant languages, frameworks, libraries,
APIs, database work, files/components, commands, configuration,
testing, debugging and deployment where appropriate.

For research tasks explain what to research, where, what data to collect,
how to organize it and what conclusions should result.

For design tasks explain screens, components, layout, UX, responsive
behavior, validation, accessibility and consistency where appropriate.

Return ONLY valid JSON in exactly this structure:

{
  "brief_explanation": "A clear, compelling summary of the task and its goal",
  "description": "Comprehensive explanation of what needs to be done",
  "workflow": [
    {
      "step": 1,
      "title": "Specific step title",
      "details": "Detailed step instructions",
      "tools": ["Tool1", "Tool2"],
      "example": "Concrete example or snippet"
    }
  ],
  "why_this_process": "Why this specific methodology is effective",
  "how_to_do_this": [
    "Actionable tactical execution step 1",
    "Actionable tactical execution step 2",
    "Actionable tactical execution step 3"
  ],
  "tools_required": [
    {
      "name": "Tool Name",
      "purpose": "Specific purpose"
    }
  ],
  "expected_output": "The concrete deliverable",
  "common_mistakes": ["Mistake 1", "Mistake 2"],
  "completion_checklist": ["Checklist item 1", "Checklist item 2"],
  "guidance_links": [],
  "suitable_links": []
}

Rules:
- workflow must contain 4 to 8 specific steps.
- Every step must directly relate to the task.
- how_to_do_this must contain at least 4 detailed tactical steps.
- Do NOT use placeholder dots like '...' anywhere.
- Return JSON only.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"TASK:\n{task}\n{context_text}\n\nGenerate the detailed guide.",
        },
    ]

    try:
        result = await call_openrouter(
            messages=messages,
            max_tokens=3500,
            temperature=0.4,
        )
        cleaned = _clean_json(result)
        parsed = json.loads(cleaned)

        # Validate that the model didn't return dummy dots or empty arrays
        is_bad = (
            not parsed.get("brief_explanation")
            or parsed.get("brief_explanation").strip() in ("...", "...")
            or not parsed.get("workflow")
            or len(parsed.get("workflow")) == 0
            or not parsed.get("how_to_do_this")
            or len(parsed.get("how_to_do_this")) == 0
            or any(
                (isinstance(w, dict) and (w.get("title") in ("Step", "...", "") or w.get("details") in ("...", "")))
                for w in parsed.get("workflow", [])
            )
        )
        if is_bad:
            print("DEBUG: Model returned placeholder or incomplete JSON. Using tailored domain generator.")
            return json.dumps(generate_domain_tailored_guide(task, context, phase, day), ensure_ascii=False)

        return cleaned
    except Exception as e:
        print(f"Guide Generation fallback triggered due to: {e}")
        return json.dumps(generate_domain_tailored_guide(task, context, phase, day), ensure_ascii=False)


def _as_string_list(value):
    """Normalize AI output to the array shape consumed by the frontend."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [
            line.strip().lstrip("-•").strip()
            for line in value.splitlines()
            if line.strip()
        ]
    return [str(value)]


def _clean_json(value):
    parsed = None
    try:
        from json_repair import repair_json
        parsed = repair_json(value, return_objects=True)
        if not isinstance(parsed, dict):
            parsed = None
    except Exception as e:
        print(f"DEBUG json_repair failed: {e}")

    if not parsed:
        cleaned = value.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
        except Exception:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end > start:
                try:
                    parsed = json.loads(cleaned[start : end + 1])
                except Exception:
                    parsed = {}
            else:
                parsed = {}

    if not isinstance(parsed, dict):
        parsed = {}

    for field in (
        "how_to_do_this",
        "common_mistakes",
        "completion_checklist",
        "guidance_links",
        "suitable_links",
    ):
        parsed[field] = _as_string_list(parsed.get(field))

    if not isinstance(parsed.get("workflow"), list):
        parsed["workflow"] = []
    if not isinstance(parsed.get("tools_required"), list):
        parsed["tools_required"] = []

    return json.dumps(parsed, ensure_ascii=False)


async def generate_strategy_analysis(plan_state):
    """
    AI interprets the deterministic strategy state.
    It does NOT directly modify the database.
    """
    state_json = json.dumps(plan_state, ensure_ascii=False, default=str)

    messages = [
        {
            "role": "system",
            "content": """
You are the strategy intelligence layer of DudeX AI.

Analyze the supplied startup/project execution state.
The database engine has already calculated the factual metrics.

Your job is to interpret those facts and provide:
- current_status
- key_insights
- risks
- recommendations
- next_actions
- strategy_adjustments

Do not invent metrics.
Do not claim an action was completed unless the state shows it.
Recommendations must be practical and directly connected to the state.

Return ONLY valid JSON:

{
  "current_status": "...",
  "key_insights": [],
  "risks": [
    {
      "risk": "...",
      "severity": "low|medium|high",
      "reason": "...",
      "mitigation": "..."
    }
  ],
  "recommendations": [],
  "next_actions": [],
  "strategy_adjustments": []
}
""",
        },
        {
            "role": "user",
            "content": f"CURRENT PLAN STATE:\n{state_json}",
        },
    ]

    try:
        result = await call_openrouter(
            messages=messages,
            max_tokens=3000,
            temperature=0.5,
        )
        return json.loads(_clean_json(result))
    except Exception as e:
        print(f"Strategy AI Error: {e}")
        return {
            "current_status": "AI analysis is temporarily unavailable.",
            "key_insights": [],
            "risks": [],
            "recommendations": [],
            "next_actions": [],
            "strategy_adjustments": [],
            "error": str(e),
        }


async def test_openrouter():
    result = await call_openrouter(
        [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {
                "role": "user",
                "content": "Reply with exactly: DudeX AI is working.",
            },
        ],
        max_tokens=100,
        temperature=0.5,
    )
    print(result)
    return result
