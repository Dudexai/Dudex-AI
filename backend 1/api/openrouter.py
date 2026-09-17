import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "inclusionai/ling-3.0-flash-fin:free"


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

            content = choices[0].get("message", {}).get("content")
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
            "content": """
You are DudeX AI, an expert startup strategist, product manager,
software architect and project mentor.

Convert the user's idea into a practical, realistic execution plan.
The plan must be specific to the idea, not generic.

Analyze:
- problem and target users
- MVP scope
- required features
- frontend/backend/database requirements
- authentication and APIs when needed
- AI requirements when needed
- testing, deployment and launch
- future improvements

Create a realistic day-by-day plan for the requested number of days.
Each day must contain actual, specific work. Avoid phrases such as
"continue development" or "work on the project".

When JSON is requested, return valid JSON only.
""",
        },
        {
            "role": "user",
            "content": "\n\n".join(context_parts)
            + "\n\nCreate the complete practical project execution plan.",
        },
    ]

    return await call_openrouter(messages, max_tokens=5000, temperature=0.75)


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
  "brief_explanation": "...",
  "description": "...",
  "workflow": [
    {
      "step": 1,
      "title": "...",
      "details": "...",
      "tools": [],
      "example": "..."
    }
  ],
  "why_this_process": "...",
  "how_to_do_this": [],
  "tools_required": [
    {
      "name": "...",
      "purpose": "..."
    }
  ],
  "expected_output": "...",
  "common_mistakes": [],
  "completion_checklist": [],
  "guidance_links": [],
  "suitable_links": []
}

Rules:
- workflow must contain 4 to 8 specific steps.
- Every step must directly relate to the task.
- how_to_do_this, common_mistakes, completion_checklist, guidance_links,
  and suitable_links must always be arrays.
- Do not invent URLs.
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
            max_tokens=5000,
            temperature=0.75,
        )
        return _clean_json(result)
    except Exception as e:
        print(f"Guide Generation Error: {e}")
        fallback = {
            "brief_explanation": f"The AI guide for '{task}' could not be generated right now.",
            "description": "The AI service was unable to provide a complete task-specific guide.",
            "workflow": [
                {
                    "step": 1,
                    "title": "Understand the task",
                    "details": f"Review '{task}' and identify the exact result that must be produced.",
                    "tools": [],
                    "example": "",
                },
                {
                    "step": 2,
                    "title": "Break the work into actions",
                    "details": "Divide the task into smaller actions that can be completed and verified.",
                    "tools": [],
                    "example": "",
                },
                {
                    "step": 3,
                    "title": "Complete the work",
                    "details": "Perform each action and record important results.",
                    "tools": [],
                    "example": "",
                },
                {
                    "step": 4,
                    "title": "Verify the result",
                    "details": "Check the completed work against the original requirements.",
                    "tools": [],
                    "example": "",
                },
            ],
            "why_this_process": "Breaking the task into smaller actions makes it easier to execute and verify.",
            "how_to_do_this": [
                f"Review the requirements of '{task}'.",
                "Break the work into measurable actions.",
                "Complete and verify each action.",
            ],
            "tools_required": [],
            "expected_output": "A completed and verified implementation of the requested task.",
            "common_mistakes": [
                "Ignoring the original requirements.",
                "Skipping important steps.",
                "Not checking the final result.",
            ],
            "completion_checklist": [
                "All requirements have been addressed.",
                "The completed work has been tested or reviewed.",
                "The expected result is available.",
            ],
            "guidance_links": [],
            "suitable_links": [],
        }
        return json.dumps(fallback, ensure_ascii=False)


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
        if not isinstance(parsed, dict):
            raise ValueError("AI response is not a JSON object.")
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end <= start:
            raise Exception("AI returned an invalid JSON format.")

        parsed = json.loads(cleaned[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("AI response is not a JSON object.")

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
