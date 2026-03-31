"""
SMS Service for phone verification using Twilio
"""
import os
import random
import logging
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "AC6f21a70971273a4e7abfe1d5aa578815")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "9a76fc12b0e66a0769d4cc072afa6d59")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+12495233568")

# Initialize Twilio client
try:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    logger.info("Twilio client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Twilio client: {e}")
    twilio_client = None


def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))


def format_phone_number(phone: str) -> str:
    """Format phone number to E.164 format for Twilio"""
    # Remove all non-numeric characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Add country code if not present (assume US/Canada +1)
    if len(digits) == 10:
        digits = '1' + digits
    
    # Return in E.164 format
    return '+' + digits


def send_verification_sms(phone: str, code: str) -> dict:
    """
    Send SMS verification code to phone number
    
    Args:
        phone: Phone number to send to
        code: 6-digit verification code
    
    Returns:
        dict with success status and message
    """
    if not twilio_client:
        logger.error("Twilio client not initialized")
        return {"success": False, "error": "SMS service unavailable"}
    
    try:
        formatted_phone = format_phone_number(phone)
        
        message_body = f"""MiPropertyGuru Verification

Your verification code is: {code}

This code expires in 10 minutes.

If you didn't request this code, please ignore this message."""
        
        message = twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        
        logger.info(f"SMS sent successfully to {formatted_phone[:6]}*** - SID: {message.sid}")
        return {"success": True, "message_sid": message.sid}
        
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return {"success": False, "error": str(e)}


def send_welcome_sms(phone: str, name: str) -> dict:
    """Send welcome SMS after successful registration"""
    if not twilio_client:
        return {"success": False, "error": "SMS service unavailable"}
    
    try:
        formatted_phone = format_phone_number(phone)
        
        message_body = f"""Welcome to MiPropertyGuru, {name}! 🏠

Your phone number has been verified successfully.

You can now receive important updates about your jobs and messages.

- The MiPropertyGuru Team"""
        
        message = twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        
        logger.info(f"Welcome SMS sent to {formatted_phone[:6]}***")
        return {"success": True, "message_sid": message.sid}
        
    except Exception as e:
        logger.error(f"Failed to send welcome SMS: {e}")
        return {"success": False, "error": str(e)}
