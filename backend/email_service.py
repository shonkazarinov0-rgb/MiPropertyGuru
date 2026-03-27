"""
Email Service for MiPropertyGuru
Handles all email communications using SendGrid
"""
import os
import random
import string
from datetime import datetime, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from dotenv import load_dotenv

load_dotenv()

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL', 'info@mipropertyguru.ca')
FROM_NAME = os.getenv('SENDGRID_FROM_NAME', 'MiPropertyGuru')

# Store verification codes temporarily (in production, use Redis or database)
verification_codes = {}
password_reset_codes = {}


def generate_code(length=6):
    """Generate a random numeric verification code"""
    return ''.join(random.choices(string.digits, k=length))


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email using SendGrid"""
    try:
        message = Mail(
            from_email=Email(FROM_EMAIL, FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Email sent to {to_email}, status: {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_welcome_email(to_email: str, user_name: str, is_contractor: bool = False) -> bool:
    """Send welcome email after registration"""
    user_type = "contractor" if is_contractor else "client"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
            .header {{ background: linear-gradient(135deg, #D35400 0%, #E67E22 100%); padding: 40px 20px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; }}
            .content h2 {{ color: #333333; margin-top: 0; }}
            .content p {{ color: #666666; line-height: 1.6; font-size: 16px; }}
            .button {{ display: inline-block; background-color: #D35400; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .features {{ background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .features li {{ color: #666666; margin: 10px 0; }}
            .footer {{ background-color: #333333; padding: 30px; text-align: center; }}
            .footer p {{ color: #999999; margin: 5px 0; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to MiPropertyGuru!</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Thank you for joining MiPropertyGuru as a {user_type}. We're excited to have you on board!</p>
                
                {"<p>As a contractor, you can now:</p><ul class='features'><li>Receive job requests from clients in your area</li><li>Showcase your portfolio and skills</li><li>Build your reputation with reviews</li><li>Grow your business</li></ul>" if is_contractor else "<p>As a client, you can now:</p><ul class='features'><li>Find trusted contractors near you</li><li>Post jobs and receive quotes</li><li>Chat directly with contractors</li><li>Get your projects done!</li></ul>"}
                
                <p>If you have any questions, our support team is here to help.</p>
                
                <p>Best regards,<br><strong>The MiPropertyGuru Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; 2025 MiPropertyGuru. All rights reserved.</p>
                <p>info@mipropertyguru.ca</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "Welcome to MiPropertyGuru! 🎉", html_content)


def send_verification_code(to_email: str, user_name: str) -> str:
    """Send email verification code and return the code"""
    code = generate_code()
    
    # Store code with expiry (15 minutes)
    verification_codes[to_email] = {
        'code': code,
        'expires': datetime.now() + timedelta(minutes=15)
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
            .header {{ background: linear-gradient(135deg, #D35400 0%, #E67E22 100%); padding: 40px 20px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; text-align: center; }}
            .content p {{ color: #666666; line-height: 1.6; font-size: 16px; }}
            .code-box {{ background-color: #f5f5f5; padding: 30px; border-radius: 12px; margin: 30px 0; }}
            .code {{ font-size: 42px; font-weight: bold; color: #D35400; letter-spacing: 8px; }}
            .expiry {{ color: #999999; font-size: 14px; margin-top: 15px; }}
            .footer {{ background-color: #333333; padding: 30px; text-align: center; }}
            .footer p {{ color: #999999; margin: 5px 0; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email</h1>
            </div>
            <div class="content">
                <p>Hi {user_name}!</p>
                <p>Please use the following verification code to complete your registration:</p>
                
                <div class="code-box">
                    <div class="code">{code}</div>
                    <p class="expiry">This code expires in 15 minutes</p>
                </div>
                
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 MiPropertyGuru. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email(to_email, "Your Verification Code - MiPropertyGuru", html_content)
    return code


def verify_code(email: str, code: str) -> bool:
    """Verify the email verification code"""
    if email not in verification_codes:
        return False
    
    stored = verification_codes[email]
    if datetime.now() > stored['expires']:
        del verification_codes[email]
        return False
    
    if stored['code'] == code:
        del verification_codes[email]
        return True
    
    return False


def send_password_reset_email(to_email: str, user_name: str) -> str:
    """Send password reset code"""
    code = generate_code()
    
    # Store code with expiry (30 minutes)
    password_reset_codes[to_email] = {
        'code': code,
        'expires': datetime.now() + timedelta(minutes=30)
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
            .header {{ background: linear-gradient(135deg, #D35400 0%, #E67E22 100%); padding: 40px 20px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; text-align: center; }}
            .content p {{ color: #666666; line-height: 1.6; font-size: 16px; }}
            .code-box {{ background-color: #f5f5f5; padding: 30px; border-radius: 12px; margin: 30px 0; }}
            .code {{ font-size: 42px; font-weight: bold; color: #D35400; letter-spacing: 8px; }}
            .expiry {{ color: #999999; font-size: 14px; margin-top: 15px; }}
            .warning {{ background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }}
            .footer {{ background-color: #333333; padding: 30px; text-align: center; }}
            .footer p {{ color: #999999; margin: 5px 0; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Reset Your Password</h1>
            </div>
            <div class="content">
                <p>Hi {user_name}!</p>
                <p>We received a request to reset your password. Use the code below to proceed:</p>
                
                <div class="code-box">
                    <div class="code">{code}</div>
                    <p class="expiry">This code expires in 30 minutes</p>
                </div>
                
                <div class="warning">
                    <strong>Didn't request this?</strong><br>
                    If you didn't request a password reset, please ignore this email or contact support if you're concerned.
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 MiPropertyGuru. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email(to_email, "Password Reset Request - MiPropertyGuru", html_content)
    return code


def verify_reset_code(email: str, code: str) -> bool:
    """Verify the password reset code"""
    if email not in password_reset_codes:
        return False
    
    stored = password_reset_codes[email]
    if datetime.now() > stored['expires']:
        del password_reset_codes[email]
        return False
    
    if stored['code'] == code:
        del password_reset_codes[email]
        return True
    
    return False


def send_support_email(from_email: str, user_name: str, subject: str, message: str) -> bool:
    """Send support request to the support inbox"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; }}
            .header {{ border-bottom: 2px solid #D35400; padding-bottom: 20px; margin-bottom: 20px; }}
            .header h1 {{ color: #D35400; margin: 0; font-size: 24px; }}
            .info {{ background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            .info p {{ margin: 5px 0; color: #666; }}
            .info strong {{ color: #333; }}
            .message {{ padding: 20px; background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #D35400; }}
            .message p {{ color: #333; white-space: pre-wrap; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Support Request</h1>
            </div>
            
            <div class="info">
                <p><strong>From:</strong> {user_name}</p>
                <p><strong>Email:</strong> {from_email}</p>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <h3>Message:</h3>
            <div class="message">
                <p>{message}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to support inbox
    return send_email(FROM_EMAIL, f"Support Request: {subject}", html_content)


def send_support_confirmation(to_email: str, user_name: str, subject: str) -> bool:
    """Send confirmation to user that their support request was received"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; }}
            .header {{ background: linear-gradient(135deg, #D35400 0%, #E67E22 100%); padding: 40px 20px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; }}
            .content h2 {{ color: #333333; margin-top: 0; }}
            .content p {{ color: #666666; line-height: 1.6; font-size: 16px; }}
            .ticket-box {{ background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
            .ticket-box p {{ color: #2e7d32; margin: 0; }}
            .footer {{ background-color: #333333; padding: 30px; text-align: center; }}
            .footer p {{ color: #999999; margin: 5px 0; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>We Got Your Message!</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Thank you for contacting MiPropertyGuru support. We've received your message regarding:</p>
                
                <div class="ticket-box">
                    <p><strong>"{subject}"</strong></p>
                </div>
                
                <p>Our team will review your request and get back to you as soon as possible, usually within 24-48 hours.</p>
                
                <p>Best regards,<br><strong>The MiPropertyGuru Support Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; 2025 MiPropertyGuru. All rights reserved.</p>
                <p>info@mipropertyguru.ca</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, "We received your support request - MiPropertyGuru", html_content)
