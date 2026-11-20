import os
import json
import httpx
from dotenv import load_dotenv
from api.openrouter import call_openrouter, _clean_json

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def get_gemini_config():
    """Dynamically re-reads environment config so changes in .env apply immediately."""
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
    return api_key, model


async def _fallback_to_openrouter(prompt: str, system_instruction: str, max_tokens: int, temperature: float) -> str:
    """Seamlessly falls back to OpenRouter to ensure zero customer wait time."""
    fallback_messages = []
    if system_instruction:
        fallback_messages.append({"role": "system", "content": system_instruction})
    fallback_messages.append({"role": "user", "content": prompt})
    return await call_openrouter(fallback_messages, max_tokens=max_tokens, temperature=temperature)


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
    Falls back seamlessly and rapidly to OpenRouter if Gemini API key is missing,
    rate-limited (429), unavailable (503), or times out, ensuring customers never wait.
    """
    api_key, model = get_gemini_config()

    if not api_key:
        print("NOTICE: GEMINI_API_KEY not found. Routing immediately to OpenRouter.")
        return await _fallback_to_openrouter(prompt, system_instruction, max_tokens, temperature)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
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

    # If search grounding is requested, attempt it first; if rate-limited (429) or unsupported, fall back to standard Gemini immediately
    if enable_search:
        payload["tools"] = [{"google_search": {}}]
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"]
            # 429 quota or other issue: drop tools and proceed immediately
            print(f"NOTICE: Search grounding returned status {response.status_code}. Retrying instantly with fast direct Gemini...")
            payload.pop("tools", None)
        except Exception as search_err:
            print(f"NOTICE: Search grounding skipped ({search_err}). Proceeding with direct Gemini...")
            payload.pop("tools", None)

    # Direct Gemini generation (blazing fast ~5-8s)
    try:
        async with httpx.AsyncClient(timeout=18.0) as client:
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

        print(f"DEBUG: Gemini API returned status {response.status_code}: {response.text[:200]}")
        raise Exception(f"Gemini API Error {response.status_code}")

    except Exception as e:
        print(f"FAST FALLBACK: Gemini unavailable or timed out ({e}). Seamlessly switching to OpenRouter so customer does not wait.")
        return await _fallback_to_openrouter(prompt, system_instruction, max_tokens, temperature)


# =====================================================================
# AGENT 1: ANALYZING AGENT (Competitor & Market Intelligence)
# =====================================================================

async def analyze_market(idea: str, startup_name: str = "My Startup", target_region: str = "Global & India"):
    system_prompt = """You are DudeX Analyzing Agent, an expert startup market researcher and competitive intelligence analyst.
Analyze both indigenous (domestic/India) and global competitors, plus venture feasibility.
Keep all text fields concise, punchy, and under 25 words for rapid execution.
Return strictly valid JSON only:
{
  "startup_name": "<Name>",
  "one_line_summary": "<Punchy 1-sentence value proposition>",
  "overall_feasibility_score": 78,
  "verdict": "VIABLE_WITH_PIVOTS",
  "verdict_title": "Strong Opportunity with Clear Wedge",
  "verdict_summary": "<1-sentence strategic summary>",
  "final_recommendation": "PROCEED_TO_VALIDATION",
  "metrics": {
    "competition_density": {
      "score_percentage": 75,
      "level": "High",
      "top_competitors": ["<Comp 1>", "<Comp 2>", "<Comp 3>"],
      "barrier_to_entry": "Moderate",
      "analysis": "<Brief competition analysis>"
    },
    "global_market_demand": {
      "score_percentage": 85,
      "sentiment": "POSITIVE",
      "sentiment_label": "Worth Starting (High Demand)",
      "addressable_market_trend": "Growing at 18% CAGR",
      "analysis": "<Brief demand analysis>"
    },
    "five_year_future_outlook": {
      "positive_percentage": 68,
      "negative_percentage": 32,
      "future_verdict": "Defensible with Proprietary Data Loops",
      "disruption_risk": "Moderate",
      "analysis": "<Brief 5-year outlook>"
    }
  },
  "indigenous_competitors": [
    {
      "name": "<Local Competitor>",
      "region": "India",
      "url": "<URL or Search query>",
      "strengths": "<Their localized edge>",
      "weaknesses": "<Their vulnerability>"
    }
  ],
  "global_competitors": [
    {
      "name": "<Global Leader>",
      "url": "<URL>",
      "pricing_model": "Freemium / B2B SaaS",
      "vulnerabilities": "<Where they fall short>"
    }
  ],
  "unfair_advantage": "<The 10x differentiator or wedge>",
  "tam_sam_som": {
    "tam": "$12B",
    "sam": "$2.5B",
    "som": "$50M"
  },
  "market_validation_experiments": [
    {
      "step": 1,
      "test_name": "<48-hr validation experiment>",
      "method": "<Unscalable manual test>",
      "metric": "<Quantitative target>"
    }
  ],
  "category_breakdown": [
    {
      "category": "Market Demand & Urgency",
      "score": 85,
      "status": "Strong Positive",
      "positive_reasons": ["Urgent workflow bottleneck", "Clear willingness to pay"],
      "negative_reasons": ["Requires user education"],
      "verdict": "Strong customer appetite."
    },
    {
      "category": "Competitive Moat",
      "score": 70,
      "status": "Defensible Niche",
      "positive_reasons": ["10x faster execution than legacy incumbents"],
      "negative_reasons": ["Must build proprietary network effects"],
      "verdict": "Viable wedge against incumbents."
    }
  ],
  "honest_growth_verdict": {
    "headline": "High-Conviction Venture with Laser-Focused Wedge",
    "summary": "Execute unscalable validation tests immediately before scaling automation.",
    "fatal_flaw": "Scaling outbound before securing first 3 reference customers.",
    "unfair_advantage": "<The unfair advantage>",
    "actionable_suggestion": "Focus strictly on Max's YC playbook: work warm connections for first 3 customers."
  }
}"""

    user_prompt = f"""STARTUP NAME: {startup_name}
TARGET REGION / MARKET: {target_region}
IDEA & PROBLEM STATEMENT:
{idea}

Perform live market and competitor analysis now. Return strictly valid JSON."""

    raw_response = await call_gemini(
        prompt=user_prompt,
        system_instruction=system_prompt,
        enable_search=False,
        temperature=0.3,
        max_tokens=1500
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
