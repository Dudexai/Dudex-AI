import os
import resend
from apscheduler.schedulers.background import BackgroundScheduler
from supabase import create_client, Client
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

# Initialize Supabase client if configured
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase in email service: {e}")

scheduler = BackgroundScheduler()

def check_upcoming_meetings():
    if not supabase or not resend.api_key:
        print("Email service disabled - Missing Supabase or Resend credentials.")
        return

    try:
        # Fetch meetings scheduled for today
        response = supabase.table("calendar_events").select("*").eq("event_type", "meeting").eq("status", "Scheduled").execute()
        meetings = response.data

        if not meetings:
            return

        now = datetime.now()
        
        for meeting in meetings:
            try:
                # Parse event_time "HH:MM"
                if not meeting.get("event_time"):
                    continue
                    
                time_str = str(meeting["event_time"]).replace(".", ":")
                time_parts = time_str.split(":")
                hours = int(time_parts[0])
                minutes = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Construct exact meeting datetime
                # Note: event_month from frontend was 0-indexed. Adding 1 to correct for Python datetime
                meeting_dt = datetime(
                    meeting["event_year"], 
                    meeting["event_month"] + 1, 
                    meeting["event_day"], 
                    hours, 
                    minutes
                )
                
                # Calculate difference
                diff = meeting_dt - now
                diff_minutes = diff.total_seconds() / 60.0
                
                # If meeting is exactly in the 10-11 minute window, send email!
                if 9 < diff_minutes <= 11:
                    print(f"Sending automated meeting reminder for: {meeting['title']}")
                    send_meeting_reminders(meeting)
                    
            except Exception as e:
                print(f"Error processing meeting {meeting.get('id')}: {e}")

    except Exception as e:
        print(f"Error checking upcoming meetings: {e}")

def send_meeting_reminders(meeting):
    attendees = meeting.get("attendees", [])
    if not attendees:
        return

    subject = f"Reminder: {meeting.get('title')} starts in 10 minutes!"
    link = meeting.get("link_or_poster", "No link provided")
    
    html_content = f"""
    <h2>Your meeting is starting soon!</h2>
    <p><strong>{meeting.get('title')}</strong> is scheduled to begin in 10 minutes.</p>
    <br/>
    <p>Click the link below to join:</p>
    <a href="{link}" style="padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Join Meeting</a>
    <br/><br/>
    <p>Or use this link directly: <a href="{link}">{link}</a></p>
    <br/>
    <p>Best regards,<br/>Startup OS AI</p>
    """

    try:
        r = resend.Emails.send({
            "from": "meetings@dudexai.com", # Or a verified domain from Resend
            "to": attendees,
            "subject": subject,
            "html": html_content
        })
        print(f"Successfully sent reminder to {attendees}: {r}")
    except Exception as e:
        print(f"Failed to send email to {attendees}: {e}")

def start_scheduler():
    scheduler.add_job(check_upcoming_meetings, 'interval', minutes=1)
    scheduler.start()
    print("Background Email Scheduler Started")

def stop_scheduler():
    scheduler.shutdown()

def send_invite_email(to_email: str, startup_name: str, inviter_email: str, invite_url: str, token: str):
    if not resend.api_key:
        print("Error: Resend API key not configured for sending invites.")
        return False
        
    subject = f"You have been invited to join {startup_name}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Join {startup_name} on DudexAI</h2>
        <p>Hello,</p>
        <p>You have been invited by <strong>{inviter_email}</strong> to collaborate on their startup, "{startup_name}".</p>
        <p>Working together in DudexAI brings your strategy, planning, and execution into one unified workspace.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{invite_url}" style="padding: 12px 24px; background-color: #f26622; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
        </div>
        <p style="text-align: center; font-size: 14px; color: #666;">
            Or use your unique invite token manually:<br/>
            <code style="background-color: #f1f1f1; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">{token}</code>
        </p>
        <br/>
        <p>Best regards,<br/>The DudexAI Team</p>
    </div>
    """

    try:
        r = resend.Emails.send({
            "from": "invites@dudexai.com",
            "to": [to_email],
            "subject": subject,
            "html": html_content
        })
        print(f"Successfully sent invite email to {to_email}: {r}")
        return True
    except Exception as e:
        print(f"Failed to send invite email to {to_email}: {e}")
        return False

def send_meeting_invites(attendees: list[str], title: str, date: str, time: str, link: str, inviter_email: str, inviter_name: str = "", startup_name: str = ""):
    if not resend.api_key:
        print("Error: Resend API key not configured for sending meeting invites.")
        return False
        
    subject = f"Meeting Invitation: {title}"
    
    if inviter_name and startup_name:
        inviter_text = f"<strong>{inviter_name}</strong> from <strong>{startup_name}</strong>"
    elif startup_name:
        inviter_text = f"<strong>{startup_name}</strong>"
    elif inviter_name:
        inviter_text = f"<strong>{inviter_name}</strong>"
    else:
        inviter_text = f"<strong>{inviter_email}</strong>"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Meeting Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited by {inviter_text} to a meeting.</p>
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Topic:</strong> {title}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> {time}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{link}" style="padding: 12px 24px; background-color: #f26622; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Join Meeting</a>
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 14px; color: #666;">
            <p>Or use this link directly:</p>
            <a href="{link}" style="color: #f26622;">{link}</a>
        </div>
        <p>Best regards,<br/>Startup OS AI</p>
    </div>
    """

    try:
        r = resend.Emails.send({
            "from": "meetings@dudexai.com",
            "to": attendees,
            "subject": subject,
            "html": html_content
        })
        print(f"Successfully sent meeting invite to {attendees}: {r}")
        return True
    except Exception as e:
        print(f"Failed to send meeting invite to {attendees}: {e}")
        return False
