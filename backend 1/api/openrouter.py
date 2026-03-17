import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost",
    "X-Title": "Startup Canvas"
}


async def generate_startup_plan(idea: str, days: int):
    payload = {
        "model": "x-ai/grok-4.1-fast",
        "messages": [
            {
                "role": "system",
                "content": "You are a startup planning expert. Return ONLY valid JSON."
            },
            {
                "role": "user",
                "content": f"""
Startup idea: {idea}
Timeline: {days} days

Return a detailed startup plan in JSON format.
Exactly:

{{
 "title": "Startup Name",
 "summary": "One sentence summary",
 "tasks": [
   {{
     "title": "Task title",
     "description": "Short description",
     "priority": "High|Medium|Low",
     "estimated_days": 1,
     "phase": "Validation|Build|Launch"
   }}
 ],
 "kpis": ["KPI 1", "KPI 2"],
 "risks": ["Risk 1", "Risk 2"]
}}

IMPORTANT: 
- You MUST provide exactly as many tasks as the number of days specified in the user request. 
- If the user asks for a 30-day plan, you MUST provide 30 distinct, meaningful tasks.
- Every single day must have at least one unique, actionable task. Do NOT leave any days with zero tasks.
- Return ONLY the raw JSON string. 
- Do not wrap in markdown code blocks. 
- Do not add explanations.
"""
            }
        ],
        "temperature": 0.3
    }

    async with httpx.AsyncClient(timeout=90) as client:
        try:
            print(f"DEBUG: Generating plan for idea: {idea:.50}...")
            res = await client.post(
                OPENROUTER_URL,
                headers=HEADERS,
                json=payload
            )
            
            if res.status_code != 200:
                print(f"DEBUG: OpenRouter error {res.status_code}: {res.text}")
                res.raise_for_status()

            data = res.json()
            content = data["choices"][0]["message"]["content"]
            if not content:
                raise ValueError("Empty response from AI")
            
            import re
            
            # Extract JSON block using regex to avoid markdown parsing errors
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return match.group(0)
            
            # Fallback cleanup
            content = content.replace("```json", "").replace("```", "").strip()
            return content
        except Exception as e:
            print(f"Plan Generation Error: {str(e)}")
            raise e


async def generate_chat_response(context: str, message: str):
    payload = {
        "model": "x-ai/grok-4-fast",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful startup mentor AI. You have access to the user's current startup plan."
            },
            {
                "role": "user",
                "content": f"""
Current Plan Context:
{context}

User Query:
{message}

Please answer the user's query clearly and concisely based on their startup plan. If they ask to change something, explain that you can provide advice, but they should regenerate their plan with the new details in the intake form.
"""
            }
        ],
        "temperature": 0.5
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            print(f"DEBUG: Chat request - Model: {payload['model']}, Message: {message:.50}...")
            res = await client.post(
                OPENROUTER_URL,
                headers=HEADERS,
                json=payload
            )
            
            if res.status_code != 200:
                print(f"DEBUG: OpenRouter error {res.status_code}: {res.text}")
                res.raise_for_status()

            data = res.json()
            content = data["choices"][0]["message"]["content"]
            if not content:
                raise ValueError("Empty response from AI")
            
            return content
    except Exception as e:
        print(f"AI Chat Error: {str(e)}")
        return "I'm sorry, I'm having trouble processing your request right now"

async def generate_task_guide(task_title: str, task_description: str, phase: str, day: int):
    payload = {
        "model": "x-ai/grok-4.1-fast",
        "messages": [
            {
                "role": "system",
                "content": "You are a professional startup consultant. Your goal is to provide a comprehensive, actionable guide for a specific startup task. Return ONLY valid JSON."
            },
            {
                "role": "user",
                "content": f"""
Generate a professional guide for the following startup task:
Task: {task_title}
Description: {task_description}
Phase: {phase}
Timeline: Day {day}

The guide must be structured in JSON with the following fields:
{{
  "brief_explanation": "A high-level 1-2 sentence explanation of the task.",
  "description": "A detailed explanation of why this task is being performed and its significance.",
  "workflow": ["Step 1", "Step 2", "Step 3", "..."],
  "why_this_process": "Strategic rationale for following this specific process.",
  "how_to_do_this": "Practical tactical steps and tools to execute the task.",
  "guidance_links": [
    {{"title": "Link Title", "url": "https://example.com"}}
  ],
  "suitable_links": [
    {{"title": "Tool or Resource Title", "url": "https://example.com"}}
  ]
}}

Ensure the content is professional, insightful, and specific to the task context. 
CRITICAL: Only provide valid, high-quality documentation links from reputable sources (e.g., Stripe, AWS, HubSpot, GitHub, official docs). DO NOT hallucinate URLs or provide broken links.
Return ONLY the raw JSON string. Do not wrap in markdown code blocks.
"""
            }
        ],
        "temperature": 0.4
    }

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            print(f"DEBUG: Generating guide for task: {task_title}...")
            res = await client.post(
                OPENROUTER_URL,
                headers=HEADERS,
                json=payload
            )
            
            if res.status_code != 200:
                print(f"DEBUG: OpenRouter error {res.status_code}: {res.text}")
                if res.status_code == 402:
                    return """{
                      "brief_explanation": "Credit limit reached. This is a generic fallback guide.",
                      "description": "Your API key does not have enough credits to generate a custom guide.",
                      "workflow": ["Follow standard practices", "Check execution plan"],
                      "why_this_process": "Fallback process when AI is unavailable.",
                      "how_to_do_this": "Reflect on the task description and execute manually.",
                      "guidance_links": [],
                      "suitable_links": []
                    }"""
                res.raise_for_status()

            data = res.json()
            content = data["choices"][0]["message"]["content"]
            if not content:
                raise ValueError("Empty response from AI")
            
            import re
            
            # Extract JSON block
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return match.group(0)
                
            # Fallback cleanup
            content = content.replace("```json", "").replace("```", "").strip()
            return content
        except Exception as e:
            print(f"Guide Generation Error: {str(e)}")
            raise e
