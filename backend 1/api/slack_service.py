import os
import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_DEFAULT_CHANNEL = os.getenv("SLACK_DEFAULT_CHANNEL", "#general")
SLACK_API_BASE = "https://slack.com/api"


def get_headers():
    return {
        "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
        "Content-Type": "application/json; charset=utf-8",
    }


async def check_slack_connection():
    """Validates whether the Slack Bot token is active and installed to the workspace."""
    if not SLACK_BOT_TOKEN:
        return {"connected": False, "error": "SLACK_BOT_TOKEN is missing from .env"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{SLACK_API_BASE}/auth.test", headers=get_headers())
            data = res.json()
            if data.get("ok"):
                return {
                    "connected": True,
                    "bot_user": data.get("user"),
                    "team": data.get("team"),
                    "team_id": data.get("team_id")
                }
            else:
                return {
                    "connected": False,
                    "error": data.get("error", "invalid_auth"),
                    "hint": "Make sure you clicked 'Install to Workspace' in your Slack App settings (api.slack.com/apps) to activate the Bot token."
                }
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def post_to_slack(text: str, channel: str = None, blocks: list = None):
    """Posts a message or structured block card to a Slack channel."""
    if not SLACK_BOT_TOKEN:
        print("Slack notification skipped: SLACK_BOT_TOKEN not configured.")
        return False

    target_channel = channel or SLACK_DEFAULT_CHANNEL
    payload = {
        "channel": target_channel,
        "text": text,
    }
    if blocks:
        payload["blocks"] = blocks

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{SLACK_API_BASE}/chat.postMessage",
                headers=get_headers(),
                json=payload
            )
            data = res.json()
            if data.get("ok"):
                print(f"Successfully posted to Slack channel: {target_channel}")
                return True
            else:
                print(f"Slack postMessage failed: {data.get('error')}")
                return False
    except Exception as e:
        print(f"Error posting to Slack: {e}")
        return False


async def post_growth_alert(startup_name: str, growth_data: dict, channel: str = None):
    """
    Formats and dispatches a rich Marketing & Growth alert to Slack.
    Displays weekly ICE experiments, outreach templates, and ICP focus.
    """
    target_channel = channel or SLACK_DEFAULT_CHANNEL

    persona = growth_data.get("target_buyer_profile", {})
    experiments = growth_data.get("ice_growth_experiments", [])
    email_template = growth_data.get("outbound_templates", {}).get("cold_email", {})

    exp_text = ""
    for idx, exp in enumerate(experiments[:3], 1):
        score = exp.get("ice_score", exp.get("impact", 0) + exp.get("confidence", 0) + exp.get("ease", 0))
        exp_text += f"• *{exp.get('experiment', 'Test')}* (ICE Score: *{score}*)\n"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🚀 DudeX Growth Alert: {startup_name}"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Target ICP:*\n{persona.get('title', 'Founders / Buyers')}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Recommended Channel:*\n{persona.get('best_initial_channel', 'Warm Network / Unscalable Outreach')}"
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🔥 Priority ICE Growth Experiments This Week:*\n{exp_text or 'No experiments generated.'}"
            }
        }
    ]

    if email_template.get("body"):
        blocks.extend([
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*✉️ Recommended Outbound Template (<75 Words):*\n> *Subject:* {email_template.get('subject', 'Quick question')}\n> {email_template.get('body')}"
                }
            }
        ])

    fallback_text = f"DudeX Growth Alert for {startup_name}: Priority ICE experiments ready for review in {target_channel}"
    return await post_to_slack(text=fallback_text, channel=target_channel, blocks=blocks)
