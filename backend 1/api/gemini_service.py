import os
import json
import httpx
from dotenv import load_dotenv
from api.openrouter import call_openrouter, _clean_json

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


async def call_gemini(
    prompt: str,
    system_instruction: str = None,
    enable_search: bool = False,
    temperature: float = 0.5,
    max_tokens: int = 4000
) -> str:
    """
    Executes a prompt against Google Gemini models.
    Supports Google Search Grounding for live competitor discovery.
    Falls back seamlessly to OpenRouter if Gemini API key is missing or fails.
    """
    if not GEMINI_API_KEY:
        print("NOTICE: GEMINI_API_KEY not found. Routing to OpenRouter fallback engine.")
        fallback_messages = []
        if system_instruction:
            fallback_messages.append({"role": "system", "content": system_instruction})
        fallback_messages.append({"role": "user", "content": prompt})
        return await call_openrouter(fallback_messages, max_tokens=max_tokens, temperature=temperature)

    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    parts = []
    if system_instruction:
        parts.append({"text": f"SYSTEM INSTRUCTION:\n{system_instruction}\n\n"})
    parts.append({"text": prompt})

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens
        }
    }

    if enable_search:
        payload["tools"] = [{"google_search": {}}]

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})

        if response.status_code == 200:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"]
            
            raise Exception("Gemini returned response without valid text candidate.")

        print(f"DEBUG: Gemini API returned status {response.status_code}: {response.text}")
        raise Exception(f"Gemini API Error {response.status_code}")

    except Exception as e:
        print(f"WARNING: Gemini call failed ({e}). Falling back to OpenRouter.")
        fallback_messages = []
        if system_instruction:
            fallback_messages.append({"role": "system", "content": system_instruction})
        fallback_messages.append({"role": "user", "content": prompt})
        return await call_openrouter(fallback_messages, max_tokens=max_tokens, temperature=temperature)


# =====================================================================
# AGENT 1: ANALYZING AGENT (Competitor & Market Intelligence)
# =====================================================================

async def analyze_market(idea: str, startup_name: str = "My Startup", target_region: str = "Global & India"):
    system_prompt = """You are DudeX Analyzing Agent, an expert startup market researcher and competitive intelligence analyst.
Your task is to identify BOTH indigenous (domestic/regional) and external (global) competitors for the startup.
Return strictly valid JSON only. Do not wrap in markdown prose.

JSON Format:
{
  "startup_name": "<Startup Name>",
  "executive_summary": "<1-2 sentence core value proposition>",
  "indigenous_competitors": [
    {
      "name": "<Local/Domestic Competitor>",
      "region": "<Region/Country>",
      "url": "<URL or search identifier>",
      "strengths": "<Their key localized edge>",
      "weaknesses": "<Their vulnerability>"
    }
  ],
  "global_competitors": [
    {
      "name": "<Global Market Leader>",
      "url": "<URL>",
      "pricing_model": "<Freemium/Subscription/Enterprise>",
      "vulnerabilities": "<Where they fall short>"
    }
  ],
  "unfair_advantage": "<The unique wedge or 10x differentiator>",
  "tam_sam_som": {
    "tam": "<Total Addressable Market>",
    "sam": "<Serviceable Addressable Market>",
    "som": "<Serviceable Obtainable Market (First 12-18 Months)>"
  },
  "market_validation_experiments": [
    {
      "step": 1,
      "test_name": "<Actionable 48-hour experiment>",
      "method": "<Unscalable manual test>",
      "metric": "<Quantitative success threshold>"
    }
  ]
}"""

    user_prompt = f"""STARTUP NAME: {startup_name}
TARGET REGION / MARKET: {target_region}
IDEA & PROBLEM STATEMENT:
{idea}

Perform live market and competitor analysis now. Return strictly valid JSON."""

    raw_response = await call_gemini(
        prompt=user_prompt,
        system_instruction=system_prompt,
        enable_search=True,
        temperature=0.3
    )

    cleaned = _clean_json(raw_response)
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw_analysis": raw_response}


# =====================================================================
# AGENT 2: MARKETING AGENT (Growth & Outbound Engine)
# =====================================================================

async def generate_marketing_plan(
    startup_name: str,
    vision: str,
    current_phase: str = "Validation",
    target_icp: str = ""
):
    system_prompt = """You are DudeX Marketing Agent, incorporating:
1. Max's Y Combinator Playbook: Customers 1-3 from warm network; Customers 4-10 from unscalable manual efforts (in-person, Reddit DMs, micro-dinners); Customers 10-50 scaling via Apollo/sequences. Emails under 75 words, single CTA, 1-minute out-loud sanity check.
2. Brian Halligan's HubSpot Scaling: Generative Engine Optimization (GEO) for AI search, quarterly decision velocity, LOCKS framework, DRIs over committees.
3. Sean Ellis' Growth Hacking Loop: High-tempo testing (3-5 tests/week), ICE framework (Impact, Confidence, Ease).

Return strictly valid JSON only:
{
  "target_buyer_profile": {
    "title": "<Exact ICP Role>",
    "daily_workflow": "<Where they spend their day>",
    "best_initial_channel": "<In-person / Reddit / Niche Forums / Apollo Outreach>"
  },
  "sales_playbook_milestones": {
    "customers_1_to_3_tactics": ["<Tactical warm network step 1>", "<Tactical warm network step 2>"],
    "customers_4_to_10_tactics": ["<Unscalable in-person / Reddit / Dinner tactic 1>", "<Tactic 2>"],
    "customers_10_to_50_tactics": ["<Apollo / Sequence scaling tactic>"]
  },
  "outbound_templates": {
    "cold_email": {
      "subject": "<Compelling, short subject line>",
      "body": "<Strictly under 75 words, advice/mentorship framing or value-first teardown, single CTA>",
      "word_count": 65
    },
    "linkedin_connection_note": "<Under 200 characters, genuine human tone>"
  },
  "ice_growth_experiments": [
    {
      "experiment": "<Actionable growth experiment>",
      "impact": 8,
      "confidence": 7,
      "ease": 9,
      "ice_score": 24
    }
  ],
  "slack_growth_alert": "<Formatted markdown message summarizing this week's 3 priority growth tests>"
}"""

    user_prompt = f"""STARTUP NAME: {startup_name}
VISION & VALUE PROP: {vision}
CURRENT STAGE: {current_phase}
TARGET ICP: {target_icp or 'Not specified'}

Generate the complete growth and customer acquisition blueprint now in JSON."""

    raw_response = await call_gemini(
        prompt=user_prompt,
        system_instruction=system_prompt,
        enable_search=False,
        temperature=0.6
    )

    cleaned = _clean_json(raw_response)
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw_marketing": raw_response}


# =====================================================================
# AGENT 3: OPERATIONS & COMMUNICATIONS AGENT
# =====================================================================

async def generate_operational_action(action_type: str, context_data: dict):
    system_prompt = """You are DudeX Operations & Communications Agent.
You generate production-ready email follow-ups, meeting invites (incorporating Jitsi links), and platform-specific social copy (LinkedIn, X/Twitter thread, Community).
Return strictly valid JSON only.

JSON Format:
{
  "action_type": "email_reply | meeting_invite | social_copy",
  "email": {
    "subject": "<Subject line>",
    "html_content": "<Formatted HTML email>",
    "plain_text": "<Plain text email>"
  },
  "social_posts": {
    "linkedin": "<Ready-to-post LinkedIn text with formatting and hashtags>",
    "twitter_thread": [
      "<Tweet 1 - The Hook>",
      "<Tweet 2 - Proof / Data>",
      "<Tweet 3 - The CTA / Link>"
    ],
    "community_announcement": "<Announcement for DudeX AI Community chat>"
  }
}"""

    user_prompt = f"""ACTION TYPE: {action_type}
CONTEXT:
{json.dumps(context_data, indent=2)}

Generate the operational artifacts now in JSON."""

    raw_response = await call_gemini(
        prompt=user_prompt,
        system_instruction=system_prompt,
        enable_search=False,
        temperature=0.5
    )

    cleaned = _clean_json(raw_response)
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw_operations": raw_response}
