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
# Email for sending TO users (noreply)
NOREPLY_EMAIL = os.getenv('SENDGRID_NOREPLY_EMAIL', 'noreply@mipropertyguru.ca')
# Email for receiving admin notifications
ADMIN_EMAIL = os.getenv('ADMIN_NOTIFICATION_EMAIL', 'info@mipropertyguru.ca')
# Email for receiving support requests
SUPPORT_EMAIL = os.getenv('SUPPORT_NOTIFICATION_EMAIL', 'support@mipropertyguru.ca')
FROM_NAME = os.getenv('SENDGRID_FROM_NAME', 'MiPropertyGuru')

# Legacy - keep for backward compatibility
FROM_EMAIL = NOREPLY_EMAIL

# Store verification codes temporarily (in production, use Redis or database)
verification_codes = {}
password_reset_codes = {}


def generate_code(length=6):
    """Generate a random numeric verification code"""
    return ''.join(random.choices(string.digits, k=length))


# Modern email base template
def get_email_template(title: str, content: str, show_footer_cta: bool = False) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 40px 20px;
            }}
            .email-wrapper {{
                max-width: 600px;
                margin: 0 auto;
            }}
            .email-container {{
                background: #ffffff;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }}
            .email-header {{
                background: linear-gradient(135deg, #D35400 0%, #E67E22 50%, #F39C12 100%);
                padding: 40px 30px;
                text-align: center;
            }}
            .logo {{
                width: 60px;
                height: 60px;
                background: rgba(255,255,255,0.2);
                border-radius: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
            }}
            .logo-icon {{
                font-size: 32px;
            }}
            .email-header h1 {{
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .email-header p {{
                color: rgba(255,255,255,0.9);
                font-size: 14px;
                margin-top: 8px;
            }}
            .email-body {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 24px;
                font-weight: 700;
                color: #1a1a2e;
                margin-bottom: 16px;
            }}
            .message {{
                font-size: 16px;
                line-height: 1.7;
                color: #4a5568;
                margin-bottom: 24px;
            }}
            .highlight-box {{
                background: linear-gradient(135deg, #FFF5F0 0%, #FEF3E2 100%);
                border-left: 4px solid #D35400;
                border-radius: 12px;
                padding: 20px 24px;
                margin: 24px 0;
            }}
            .highlight-box p {{
                color: #744210;
                font-size: 15px;
                margin: 0;
            }}
            .highlight-box strong {{
                color: #D35400;
            }}
            .code-container {{
                background: linear-gradient(135deg, #FFF5F0 0%, #FEF3E2 100%);
                border: 3px solid #D35400;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }}
            .code {{
                font-size: 48px;
                font-weight: 800;
                letter-spacing: 14px;
                color: #D35400;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }}
            .code-expiry {{
                color: #744210;
                font-size: 14px;
                margin-top: 16px;
                font-weight: 500;
            }}
            .feature-list {{
                list-style: none;
                padding: 0;
                margin: 24px 0;
            }}
            .feature-list li {{
                display: flex;
                align-items: flex-start;
                padding: 12px 0;
                border-bottom: 1px solid #f0f0f0;
            }}
            .feature-list li:last-child {{
                border-bottom: none;
            }}
            .feature-icon {{
                width: 32px;
                height: 32px;
                background: #f0f0f0;
                border: 2px solid #d0d0d0;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 16px;
                flex-shrink: 0;
                color: #4a5568;
                font-size: 14px;
                font-weight: 700;
            }}
            .step-number {{
                display: inline-block;
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #D35400 0%, #E67E22 100%);
                border-radius: 50%;
                margin-right: 16px;
                color: #ffffff;
                font-size: 16px;
                font-weight: 700;
                text-align: center;
                line-height: 36px;
                vertical-align: middle;
            }}
            .feature-text {{
                color: #4a5568;
                font-size: 15px;
                line-height: 1.5;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, #D35400 0%, #E67E22 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 16px 40px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 14px rgba(211, 84, 0, 0.4);
            }}
            .divider {{
                height: 1px;
                background: linear-gradient(to right, transparent, #e2e8f0, transparent);
                margin: 30px 0;
            }}
            .signature {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #f0f0f0;
            }}
            .signature p {{
                color: #718096;
                font-size: 15px;
                margin: 4px 0;
            }}
            .signature strong {{
                color: #D35400;
            }}
            .email-footer {{
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            .footer-logo {{
                font-size: 20px;
                font-weight: 700;
                color: #D35400;
                margin-bottom: 12px;
            }}
            .footer-text {{
                color: #a0aec0;
                font-size: 13px;
                line-height: 1.6;
            }}
            .footer-links {{
                margin-top: 16px;
            }}
            .footer-links a {{
                color: #D35400;
                text-decoration: none;
                font-size: 13px;
            }}
            .social-links {{
                margin-top: 20px;
            }}
            .social-links a {{
                display: inline-block;
                width: 36px;
                height: 36px;
                background: #e2e8f0;
                border-radius: 50%;
                margin: 0 6px;
                line-height: 36px;
                color: #718096;
                text-decoration: none;
            }}
            .warning-box {{
                background: #FEF3C7;
                border-radius: 12px;
                padding: 16px 20px;
                margin: 20px 0;
            }}
            .warning-box p {{
                color: #92400E;
                font-size: 14px;
                margin: 0;
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                {content}
                <div class="email-footer">
                    <div class="footer-logo">MiPropertyGuru</div>
                    <p class="footer-text">
                        Connecting property owners with trusted contractors.<br>
                        Your home projects, made simple.
                    </p>
                    <div class="footer-links">
                        <a href="mailto:info@mipropertyguru.ca">info@mipropertyguru.ca</a>
                    </div>
                    <p class="footer-text" style="margin-top: 20px;">
                        &copy; MiPropertyGuru. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


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
    
    if is_contractor:
        features = """
            <ul class="feature-list">
                <li>
                    <span class="feature-icon">📋</span>
                    <span class="feature-text"><strong>Receive Job Requests</strong> - Get notified when clients in your area need your services</span>
                </li>
                <li>
                    <span class="feature-icon">🖼️</span>
                    <span class="feature-text"><strong>Showcase Your Work</strong> - Build a portfolio that highlights your best projects</span>
                </li>
                <li>
                    <span class="feature-icon">⭐</span>
                    <span class="feature-text"><strong>Build Your Reputation</strong> - Collect reviews and grow your business</span>
                </li>
                <li>
                    <span class="feature-icon">💬</span>
                    <span class="feature-text"><strong>Direct Messaging</strong> - Chat with clients and close deals faster</span>
                </li>
            </ul>
        """
    else:
        features = """
            <ul class="feature-list">
                <li>
                    <span class="feature-icon">🔍</span>
                    <span class="feature-text"><strong>Find Trusted Contractors</strong> - Browse verified professionals in your area</span>
                </li>
                <li>
                    <span class="feature-icon">📝</span>
                    <span class="feature-text"><strong>Post Jobs Easily</strong> - Describe your project and receive competitive quotes</span>
                </li>
                <li>
                    <span class="feature-icon">💬</span>
                    <span class="feature-text"><strong>Chat Directly</strong> - Communicate with contractors in real-time</span>
                </li>
                <li>
                    <span class="feature-icon">✅</span>
                    <span class="feature-text"><strong>Get Things Done</strong> - Complete your home projects with confidence</span>
                </li>
            </ul>
        """
    
    content = f"""
        <div class="email-header">
            <div class="logo">
                <span class="logo-icon">🏠</span>
            </div>
            <h1>Welcome to the Family!</h1>
            <p>Your journey to better home projects starts here</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Hi {user_name}! 👋</h2>
            <p class="message">
                We're thrilled to have you join MiPropertyGuru as a {user_type}! 
                You've just taken the first step towards making your home projects easier and more efficient.
            </p>
            
            <div class="highlight-box">
                <p>🎉 <strong>Your account is now active!</strong> You can start exploring the app right away.</p>
            </div>
            
            <p class="message">Here's what you can do with MiPropertyGuru:</p>
            
            {features}
            
            <div class="divider"></div>
            
            <div class="signature">
                <p>Welcome aboard!</p>
                <p><strong>The MiPropertyGuru Team</strong></p>
            </div>
        </div>
    """
    
    html = get_email_template("Welcome to MiPropertyGuru!", content)
    return send_email(to_email, "Welcome to MiPropertyGuru! 🎉", html)


def send_verification_code(to_email: str, user_name: str) -> str:
    """Send email verification code and return the code"""
    code = generate_code()
    
    # Store code with expiry (15 minutes)
    verification_codes[to_email] = {
        'code': code,
        'expires': datetime.now() + timedelta(minutes=15)
    }
    
    content = f"""
        <div class="email-header">
            <div class="logo">
                <span class="logo-icon">✉️</span>
            </div>
            <h1>Verify Your Email</h1>
            <p>Just one more step to get started</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Hi {user_name}! 👋</h2>
            <p class="message">
                Thanks for signing up! Please use the verification code below to confirm your email address and activate your account.
            </p>
            
            <div class="code-container">
                <div class="code">{code}</div>
                <p class="code-expiry">⏱️ This code expires in 15 minutes</p>
            </div>
            
            <div class="highlight-box">
                <p>💡 <strong>Tip:</strong> Enter this code in the app to complete your registration.</p>
            </div>
            
            <div class="warning-box">
                <p>🔒 If you didn't create an account with MiPropertyGuru, you can safely ignore this email.</p>
            </div>
            
            <div class="signature">
                <p>Best regards,</p>
                <p><strong>The MiPropertyGuru Team</strong></p>
            </div>
        </div>
    """
    
    html = get_email_template("Verify Your Email", content)
    send_email(to_email, "Verify Your Email - MiPropertyGuru", html)
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


def send_password_reset_email(to_email: str, user_name: str, code: str = None) -> str:
    """Send password reset code - accepts code from server or generates one"""
    if code is None:
        code = generate_code()
        # Only store code locally if not provided (backward compatibility)
        password_reset_codes[to_email] = {
            'code': code,
            'expires': datetime.now() + timedelta(minutes=30)
        }
    
    content = f"""
        <div class="email-header">
            <div class="logo">
                <span class="logo-icon">🔐</span>
            </div>
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Hi {user_name}! 👋</h2>
            <p class="message">
                No worries, it happens to the best of us! Use the code below to reset your password and get back to your account.
            </p>
            
            <div class="code-container">
                <div class="code">{code}</div>
                <p class="code-expiry">⏱️ This code expires in 30 minutes</p>
            </div>
            
            <div class="highlight-box">
                <p>🔑 <strong>Next step:</strong> Enter this code in the app, then create your new password.</p>
            </div>
            
            <div class="warning-box">
                <p>⚠️ <strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your account is safe.</p>
            </div>
            
            <div class="signature">
                <p>Stay secure,</p>
                <p><strong>The MiPropertyGuru Team</strong></p>
            </div>
        </div>
    """
    
    html = get_email_template("Reset Your Password", content)
    send_email(to_email, "Reset Your Password - MiPropertyGuru", html)
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


def send_password_changed_email(to_email: str, user_name: str) -> bool:
    """Send notification that password was successfully changed"""
    content = f"""
        <div class="email-header">
            <div class="logo">
                <span class="logo-icon">&#x2705;</span>
            </div>
            <h1>Password Changed</h1>
            <p>Your password has been updated successfully</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Hi {user_name}!</h2>
            <p class="message">
                This is to confirm that your MiPropertyGuru account password was just changed. If you made this change, no further action is needed.
            </p>
            
            <div class="highlight-box">
                <p><strong>Changed on:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            </div>
            
            <div class="warning-box">
                <p><strong>Didn't make this change?</strong> If you didn't reset your password, please contact our support team immediately at support@mipropertyguru.ca to secure your account.</p>
            </div>
            
            <div class="signature">
                <p>Stay secure,</p>
                <p><strong>The MiPropertyGuru Team</strong></p>
            </div>
        </div>
    """
    
    html = get_email_template("Password Changed Successfully", content)
    return send_email(to_email, "Your Password Has Been Changed - MiPropertyGuru", html)




def send_support_email(from_email: str, user_name: str, subject: str, message: str) -> bool:
    """Send support request to the support inbox"""
    content = f"""
        <div class="email-header">
            <div class="logo">
                <span class="logo-icon">📬</span>
            </div>
            <h1>New Support Request</h1>
            <p>A user needs your assistance</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Support Ticket Received</h2>
            
            <div class="highlight-box">
                <p><strong>From:</strong> {user_name}<br>
                <strong>Email:</strong> {from_email}<br>
                <strong>Date:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            </div>
            
            <p class="message" style="margin-top: 24px;"><strong>Subject:</strong></p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #1a1a2e; font-size: 16px; margin: 0;">{subject}</p>
            </div>
            
            <p class="message"><strong>Message:</strong></p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #D35400;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">{message}</p>
            </div>
            
            <div class="divider"></div>
            
            <p class="message" style="font-size: 14px; color: #718096;">
                Reply directly to this email to respond to the user, or contact them at: <a href="mailto:{from_email}" style="color: #D35400;">{from_email}</a>
            </p>
        </div>
    """
    
    html = get_email_template("New Support Request", content)
    # Send support requests to support@ email
    return send_email(SUPPORT_EMAIL, f"Support Request: {subject}", html)


def send_support_confirmation(to_email: str, user_name: str, subject: str) -> bool:
    """Send confirmation to user that their support request was received"""
    content = f"""
        <div class="email-header">
            <h1>We Got Your Message!</h1>
            <p>Our team is on it</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">Hi {user_name}! 👋</h2>
            <p class="message">
                Thank you for reaching out to MiPropertyGuru support. We've received your message and our team is already reviewing it.
            </p>
            
            <div class="highlight-box">
                <p><strong>Your Request:</strong><br>"{subject}"</p>
            </div>
            
            <p class="message">
                <strong>What happens next?</strong>
            </p>
            
            <ul class="feature-list">
                <li>
                    <span class="step-number">1</span>
                    <span class="feature-text">Our support team will review your message</span>
                </li>
                <li>
                    <span class="step-number">2</span>
                    <span class="feature-text">We'll investigate and prepare a response</span>
                </li>
                <li>
                    <span class="step-number">3</span>
                    <span class="feature-text">You'll hear back from us within <strong>24-48 hours</strong></span>
                </li>
            </ul>
            
            <div class="divider"></div>
            
            <p class="message" style="font-size: 14px; color: #718096;">
                Need urgent help? Contact us directly at <a href="mailto:support@mipropertyguru.ca" style="color: #D35400;">support@mipropertyguru.ca</a>
            </p>
            
            <div class="signature">
                <p>We're here to help!</p>
                <p><strong>The MiPropertyGuru Support Team</strong></p>
            </div>
        </div>
    """
    
    html = get_email_template("We Got Your Message!", content)
    return send_email(to_email, "We received your support request - MiPropertyGuru", html)



def send_admin_new_user_notification(user_name: str, user_email: str, user_phone: str, user_role: str, contractor_type: str = None) -> bool:
    """Send notification to admin when a new user registers"""
    role_display = user_role.title()
    if user_role == "contractor" and contractor_type:
        role_display = f"Contractor ({contractor_type})"
    
    content = f"""
        <div class="email-header">
            <h1>New User Registration!</h1>
            <p>Someone just joined MiPropertyGuru</p>
        </div>
        <div class="email-body">
            <h2 class="greeting">New {role_display} Signed Up!</h2>
            
            <div class="highlight-box">
                <p><strong>Name:</strong> {user_name}<br>
                <strong>Email:</strong> {user_email}<br>
                <strong>Phone:</strong> {user_phone}<br>
                <strong>Role:</strong> {role_display}<br>
                <strong>Date:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            </div>
            
            <p class="message">
                A new user has registered on MiPropertyGuru. You can view their profile in the admin dashboard.
            </p>
            
            <ul class="feature-list">
                <li>
                    <span class="step-number">1</span>
                    <span class="feature-text">Account created successfully</span>
                </li>
                <li>
                    <span class="step-number">2</span>
                    <span class="feature-text">Welcome email sent to user</span>
                </li>
                <li>
                    <span class="step-number">3</span>
                    <span class="feature-text">Verification code sent</span>
                </li>
            </ul>
            
            <div class="divider"></div>
            
            <p class="message" style="font-size: 14px; color: #718096;">
                This is an automated notification. The user can now access the app.
            </p>
        </div>
    """
    
    html = get_email_template("New User Registration", content)
    # Send admin notifications to info@ email
    return send_email(ADMIN_EMAIL, f"New {role_display}: {user_name} just registered!", html)
