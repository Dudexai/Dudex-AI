import os
import json
import httpx
from dotenv import load_dotenv

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ============================================================
# OPENROUTER MODEL
# ============================================================

MODEL = "inclusionai/ling-3.0-flash-fin:free"


# ============================================================
# COMMON HEADERS
# ============================================================

def get_headers():
    return {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://work.dudexai.com",
        "X-Title": "DudeX AI",
    }


# ============================================================
# COMMON OPENROUTER FUNCTION
# ============================================================

async def call_openrouter(
    messages,
    max_tokens=5000,
    temperature=0.75
):
    """
    Sends a request to OpenRouter and returns the AI response.
    """

    if not OPENROUTER_API_KEY:
        raise Exception(
            "OPENROUTER_API_KEY is not configured."
        )

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:

        async with httpx.AsyncClient(
            timeout=120.0
        ) as client:

            response = await client.post(
                OPENROUTER_URL,
                headers=get_headers(),
                json=payload
            )

            print(
                f"DEBUG: OpenRouter status: "
                f"{response.status_code}"
            )

            # ==================================================
            # SUCCESS
            # ==================================================

            if response.status_code == 200:

                data = response.json()

                choices = data.get(
                    "choices",
                    []
                )

                if not choices:
                    raise Exception(
                        "OpenRouter returned no choices."
                    )

                message = choices[0].get(
                    "message",
                    {}
                )

                content = message.get(
                    "content"
                )

                if not content:
                    raise Exception(
                        "OpenRouter returned empty content."
                    )

                return content

            # ==================================================
            # RATE LIMIT
            # ==================================================

            if response.status_code == 429:

                print(
                    "DEBUG: OpenRouter rate limit:"
                )

                print(response.text)

                raise Exception(
                    "The free AI model is temporarily "
                    "rate limited. Please try again shortly."
                )

            # ==================================================
            # PAYMENT / CREDIT ERROR
            # ==================================================

            if response.status_code == 402:

                print(
                    "DEBUG: OpenRouter credit/payment error:"
                )

                print(response.text)

                raise Exception(
                    "OpenRouter returned a credit/payment error."
                )

            # ==================================================
            # OTHER API ERRORS
            # ==================================================

            print(
                f"DEBUG: OpenRouter error "
                f"{response.status_code}:"
            )

            print(response.text)

            raise Exception(
                f"OpenRouter API error "
                f"{response.status_code}"
            )

    except httpx.TimeoutException:

        print(
            "DEBUG: OpenRouter request timed out."
        )

        raise Exception(
            "OpenRouter request timed out. "
            "Please try again."
        )

    except httpx.RequestError as e:

        print(
            f"DEBUG: OpenRouter connection error: {e}"
        )

        raise Exception(
            "Unable to connect to OpenRouter."
        )


# ============================================================
# GENERATE STARTUP PLAN
# ============================================================

async def generate_startup_plan(
    startup_idea,
    user_goal=None,
    additional_context=None
):
    """
    Generates a complete startup/project execution plan.
    """

    print(
        f"DEBUG: Generating startup plan for: "
        f"{startup_idea}"
    )

    context_text = ""

    if user_goal:
        context_text += f"""
USER GOAL:
{user_goal}
"""

    if additional_context:
        context_text += f"""
ADDITIONAL CONTEXT:
{additional_context}
"""

    messages = [
        {
            "role": "system",
            "content": """
You are DudeX AI, an expert startup strategist,
product manager, software architect and project mentor.

Your job is to convert a user's idea into a practical,
realistic and detailed execution plan.

IMPORTANT:

Do not give generic advice.

The plan must be specifically based on the user's idea.

Analyze:

- What the idea actually does
- Who will use it
- The main problem it solves
- Required features
- MVP scope
- Technology requirements
- Database requirements
- Backend requirements
- Frontend requirements
- Authentication if needed
- APIs if needed
- AI requirements if needed
- Testing
- Deployment
- Launch
- Future improvements

Create a realistic day-by-day execution plan.

Each day must contain actual work.

Avoid repetitive content.

A day should never simply say:
"Continue development"
"Work on the project"
"Test the application"

Instead explain exactly what should be done.

For example:

Bad:
"Develop the frontend."

Good:
"Create the landing page with a navigation bar,
hero section, feature cards, CTA button and responsive
mobile layout."

The plan should be useful for a student or developer
who wants to actually build the project.

Return detailed information.

When JSON is requested, return valid JSON only.
"""
        },
        {
            "role": "user",
            "content": f"""
PROJECT IDEA:

{startup_idea}

{context_text}

Create a practical and detailed project execution plan
for this idea.

Make every phase and day specific to this project.
"""
        }
    ]

    try:

        result = await call_openrouter(
            messages=messages,
            max_tokens=5000,
            temperature=0.75
        )

        return result

    except Exception as e:

        print(
            f"Startup Plan Generation Error: {e}"
        )

        raise


# ============================================================
# GENERATE CHAT RESPONSE
# ============================================================

async def generate_chat_response(
    messages,
    max_tokens=3000
):
    """
    Generates normal conversational AI responses.
    """

    print(
        "DEBUG: Generating chat response"
    )

    try:

        result = await call_openrouter(
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.75
        )

        return result

    except Exception as e:

        print(
            f"Chat Generation Error: {e}"
        )

        raise


# ============================================================
# GENERATE TASK GUIDE
# ============================================================

async def generate_task_guide(
    task,
    context=None
):
    """
    Generates a detailed, task-specific guide.
    """

    print(
        f"DEBUG: Generating guide for task: {task}"
    )

    context_text = ""

    if context:
        context_text = f"""
PROJECT CONTEXT:
{context}
"""

    # ========================================================
    # TASK GUIDE SYSTEM PROMPT
    # ========================================================

    system_prompt = """
You are DudeX AI.

You are an expert technical mentor, software developer,
startup advisor, researcher and project instructor.

Your job is to take ONE specific task from a project plan
and create a highly practical guide explaining exactly how
the user should complete that task.

============================================================
MOST IMPORTANT RULE
============================================================

NEVER produce generic content.

The response MUST be based specifically on the task.

For example, if the task is:

"Conduct market research for a food delivery application"

Do NOT respond with:

"Research the market."
"Check competitors."
"Follow standard practices."

Instead explain:

- Which competitors to investigate
- Which features to compare
- Which pricing information to collect
- How to analyze customer reviews
- How to organize the findings
- What conclusions to draw
- What the final research document should contain

============================================================
TASK-SPECIFIC REASONING
============================================================

Before generating the response:

1. Understand exactly what the task means.
2. Identify the expected outcome.
3. Determine the actual work required.
4. Identify appropriate tools.
5. Break the work into logical steps.
6. Explain how to verify completion.

============================================================
IF THE TASK IS TECHNICAL
============================================================

Include relevant information such as:

- Programming language
- Framework
- Libraries
- APIs
- Database
- Files/components
- Commands
- Configuration
- Testing
- Debugging
- Deployment

Only include technologies that actually make sense
for the task.

============================================================
IF THE TASK IS RESEARCH
============================================================

Explain:

- What to research
- Where to research
- What data to collect
- How to organize the data
- How to compare findings
- How to identify patterns
- What decisions should result from the research

============================================================
IF THE TASK IS DESIGN
============================================================

Explain:

- Screens
- Components
- Layout
- User flow
- UX
- Responsive behavior
- Validation
- Accessibility
- Visual consistency

============================================================
IF THE TASK IS BUSINESS / STARTUP RELATED
============================================================

Explain:

- Target customers
- Competitors
- Market information
- Customer needs
- Pricing if relevant
- Business assumptions
- Validation
- Expected business outcome

============================================================
WRITING REQUIREMENTS
============================================================

The guide must:

- Be specific
- Be practical
- Be actionable
- Be understandable to beginners
- Still contain technically useful information
- Avoid repetition
- Avoid filler
- Avoid generic statements
- Give examples where useful

Every workflow step must contain a real action.

============================================================
JSON FORMAT
============================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT use ```json.

Do NOT add text before or after the JSON.

Use exactly this structure:

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

    "how_to_do_this": [
        "...",
        "...",
        "..."
    ],

    "tools_required": [
        {
            "name": "...",
            "purpose": "..."
        }
    ],

    "expected_output": "...",

    "common_mistakes": [
        "...",
        "...",
        "..."
    ],

    "completion_checklist": [
        "...",
        "...",
        "..."
    ],

    "guidance_links": [],

    "suitable_links": []
}

============================================================
QUALITY REQUIREMENTS
============================================================

workflow:
- Minimum 4 steps
- Maximum 8 steps
- Every step must be different
- Every step must directly relate to the task

tools_required:
- Include realistic tools
- Do not add unnecessary tools

expected_output:
- Must describe a concrete final result

common_mistakes:
- Must be specific to the task

completion_checklist:
- Must help the user verify that the task is complete

guidance_links:
- Do not invent URLs

suitable_links:
- Do not invent URLs

IMPORTANT:

The response should feel like a mentor personally explaining
how to complete THIS task.

Do not use generic templates.
"""


    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": f"""
TASK:

{task}

{context_text}

Analyze the task carefully.

Generate a detailed and practical guide specifically
for this task.

Do not give generic instructions.

Every section must contain information that is useful
for completing the actual task.
"""
        }
    ]

    try:

        result = await call_openrouter(
            messages=messages,
            max_tokens=5000,
            temperature=0.75
        )

        # ====================================================
        # CLEAN RESPONSE
        # ====================================================

        cleaned_result = result.strip()

        # Remove ```json
        if cleaned_result.startswith(
            "```json"
        ):

            cleaned_result = cleaned_result[
                7:
            ]

        # Remove ```
        elif cleaned_result.startswith(
            "```"
        ):

            cleaned_result = cleaned_result[
                3:
            ]

        if cleaned_result.endswith(
            "```"
        ):

            cleaned_result = cleaned_result[
                :-3
            ]

        cleaned_result = cleaned_result.strip()

        # ====================================================
        # VALIDATE JSON
        # ====================================================

        try:

            parsed_result = json.loads(
                cleaned_result
            )

            if not isinstance(
                parsed_result,
                dict
            ):

                raise ValueError(
                    "AI response is not a JSON object."
                )

            print(
                "DEBUG: Task guide JSON validated successfully."
            )

            return json.dumps(
                parsed_result,
                ensure_ascii=False
            )

        except json.JSONDecodeError:

            print(
                "DEBUG: AI returned invalid JSON."
            )

            print(
                f"DEBUG AI RESPONSE: "
                f"{cleaned_result}"
            )

            # =================================================
            # TRY TO EXTRACT JSON
            # =================================================

            start = cleaned_result.find(
                "{"
            )

            end = cleaned_result.rfind(
                "}"
            )

            if (
                start != -1
                and end != -1
                and end > start
            ):

                possible_json = (
                    cleaned_result[
                        start:end + 1
                    ]
                )

                try:

                    parsed_result = json.loads(
                        possible_json
                    )

                    return json.dumps(
                        parsed_result,
                        ensure_ascii=False
                    )

                except json.JSONDecodeError:

                    pass

            raise Exception(
                "AI returned an invalid guide format."
            )

    except Exception as e:

        print(
            f"Guide Generation Error: {e}"
        )

        # ====================================================
        # FALLBACK
        # ====================================================

        fallback = {
            "brief_explanation":
                f"The AI guide for '{task}' "
                "could not be generated right now.",

            "description":
                "The AI service was unable to provide "
                "a complete task-specific guide. "
                "Please try again shortly.",

            "workflow": [
                {
                    "step": 1,
                    "title":
                        "Understand the task",

                    "details":
                        f"Review '{task}' and identify "
                        "the exact result that needs "
                        "to be produced.",

                    "tools": [],

                    "example": ""
                },

                {
                    "step": 2,
                    "title":
                        "Break the task into actions",

                    "details":
                        "Divide the task into smaller "
                        "actions that can be completed "
                        "and verified individually.",

                    "tools": [],

                    "example": ""
                },

                {
                    "step": 3,
                    "title":
                        "Complete the work",

                    "details":
                        "Perform each action and keep "
                        "track of important results.",

                    "tools": [],

                    "example": ""
                },

                {
                    "step": 4,
                    "title":
                        "Verify the result",

                    "details":
                        "Check the completed work against "
                        "the original task requirements.",

                    "tools": [],

                    "example": ""
                }
            ],

            "why_this_process":
                "Breaking a task into smaller actions "
                "makes the work easier to execute "
                "and verify.",

            "how_to_do_this": [
                f"Review the requirements of '{task}'.",
                "Break the work into measurable actions.",
                "Complete and verify each action."
            ],

            "tools_required": [],

            "expected_output":
                "A completed and verified implementation "
                "of the requested task.",

            "common_mistakes": [
                "Ignoring the original requirements.",
                "Skipping important steps.",
                "Not checking the final result."
            ],

            "completion_checklist": [
                "All requirements have been addressed.",
                "The completed work has been tested or reviewed.",
                "The expected result is available."
            ],

            "guidance_links": [],

            "suitable_links": []
        }

        return json.dumps(
            fallback,
            ensure_ascii=False
        )


# ============================================================
# TEST OPENROUTER CONNECTION
# ============================================================

async def test_openrouter():
    """
    Simple OpenRouter connection test.
    """

    print(
        "DEBUG: Testing OpenRouter..."
    )

    messages = [
        {
            "role": "system",
            "content":
                "You are a helpful AI assistant."
        },
        {
            "role": "user",
            "content":
                "Reply with exactly: DudeX AI is working."
        }
    ]

    try:

        result = await call_openrouter(
            messages=messages,
            max_tokens=100,
            temperature=0.5
        )

        print(
            "========================================"
        )

        print(
            "OPENROUTER TEST SUCCESS"
        )

        print(
            "========================================"
        )

        print(result)

        return result

    except Exception as e:

        print(
            "========================================"
        )

        print(
            "OPENROUTER TEST FAILED"
        )

        print(
            "========================================"
        )

        print(e)

        return None
