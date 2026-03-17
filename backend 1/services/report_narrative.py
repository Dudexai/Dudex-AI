from api.openrouter import HEADERS, OPENROUTER_URL
import httpx
import json

async def generate_investor_narrative(summary_data: dict):
    """
    Calls OpenRouter Grok to generate a professional investor report narrative.
    """
    
    # Pre-validation check
    if summary_data['execution']['is_pre_validation']:
        pre_val_intro = "The startup is currently in the pre-validation stage. No execution data has been recorded yet."
    else:
        pre_val_intro = f"The startup has successfully completed {summary_data['execution']['tasks_completed']} tasks, reaching an overall progress of {summary_data['execution']['overall_progress']}%."

    prompt = f"""
You are a startup analyst writing for investors. Your goal is to convert the following raw startup data into a professional, concise, and evidence-based investor report.

Tone: Professional, clinical, no hype, no fluff.
Sections: Markdown headers for:
# Startup Overview
# Validation
# Product Progress
# Traction
# Roadmap
# Risks
# Next Steps

Data:
{json.dumps(summary_data, indent=2)}

Guidelines:
- If tasks_completed == 0, explicitly state "The venture is currently in the pre-validation stage."
- Focus on evidence-based progress (Validation score, completed tasks).
- Do not hallucinate traction or users if they are not in the data.
- Interpret the Roadmap (Sprints) based on what is completed vs remaining.
- Be honest about risks and mitigation.

Return ONLY the markdown text.
"""

    payload = {
        "model": "openrouter/auto", # Using auto model for report generation
        "messages": [
            {
                "role": "system",
                "content": "You are a professional startup investment analyst. You write concisely and strictly based on provided evidence."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            res = await client.post(
                OPENROUTER_URL,
                headers=HEADERS,
                json=payload
            )
            res.raise_for_status()
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            if not content:
                raise ValueError("Empty response from AI")
            return content
        except Exception as e:
            print(f"AI Narrative Error: {str(e)}")
            # Fallback Narrative
            return f"""
# Startup Overview
The venture, {summary_data.get('title', 'Project')}, is currently in active development.

# Validation
{pre_val_intro}

# Product Progress
Execution is ongoing based on the structured roadmap.

# Traction
Currently focused on foundational validation and development milestones.

# Roadmap
{len(summary_data.get('strategy', {}).get('sprints', []))} sprints planned in the current cycle.

# Risks
{len(summary_data.get('strategy', {}).get('risks', []))} key risks identified and under management.

# Next Steps
Continue execution of the outlined tasks and validate core assumptions.

---
*Note: AI-generated narrative was unavailable. Displaying structured execution summary instead.*
"""
