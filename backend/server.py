import socketio
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt as pyjwt
# Temporarily disabled for deployment - emergentintegrations not available on public PyPI
# from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import Request
import math
import random
import stripe
import httpx
import asyncio

# Import email service
from email_service import (
    send_welcome_email, 
    send_verification_code, 
    verify_code,
    send_password_reset_email,
    verify_reset_code,
    send_password_changed_email,
    send_support_email,
    send_support_confirmation,
    send_admin_new_user_notification,
    send_contractor_upgrade_email
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET', 'constructconnect-jwt-secret-2024-secure')
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', '')
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'mipg-admin-2024')

stripe.api_key = STRIPE_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONTRACTOR_TYPES = [
    "Electrician", "Plumber", "Handyman", "Carpenter", "Painter",
    "Roofer", "HVAC Technician", "Mason", "Welder", "General Contractor",
    "Tiler", "Landscaper", "Glazier", "Demolition Specialist",
    "Drywall Installer", "Flooring Specialist", "Insulation Installer",
    "Concrete Specialist", "Fence Installer", "Deck Builder",
    "Cabinet Maker", "Window Installer", "Siding Contractor",
    "Solar Panel Installer", "Pool Contractor", "Locksmith",
    "Garage Door Specialist", "Septic System Specialist",
    "Waterproofing Specialist", "Foundation Specialist"
]

CATEGORY_ICONS = {
    "Electrician": "⚡", "Plumber": "💧", "Handyman": "🔨", "Carpenter": "🪚",
    "Painter": "🎨", "Roofer": "🏠", "HVAC Technician": "❄️", "Mason": "🧱",
    "Welder": "🔥", "General Contractor": "👷", "Tiler": "🔲", "Landscaper": "🌳",
    "Glazier": "🪟", "Demolition Specialist": "💥", "Drywall Installer": "🏗️",
    "Flooring Specialist": "🪵", "Insulation Installer": "🧤", "Concrete Specialist": "🪨",
    "Fence Installer": "🚧", "Deck Builder": "🛠️", "Cabinet Maker": "🗄️",
    "Window Installer": "🪟", "Siding Contractor": "🏘️", "Solar Panel Installer": "☀️",
    "Pool Contractor": "🏊", "Locksmith": "🔐", "Garage Door Specialist": "🚗",
    "Septic System Specialist": "🚽", "Waterproofing Specialist": "💦", "Foundation Specialist": "🏛️"
}

# ── Pydantic Models ──

class RegisterReq(BaseModel):
    name: str
    email: Optional[str] = None
    phone: str
    password: str
    role: str
    contractor_type: Optional[str] = None
    trades: Optional[List[str]] = None
    bio: Optional[str] = ""
    experience_years: Optional[int] = 0
    service_radius: Optional[int] = 15  # Default 15km
    business_name: Optional[str] = None
    languages: Optional[List[str]] = ["English"]
    has_license: Optional[bool] = False
    license_confirmed: Optional[bool] = False

class LoginReq(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    keep_logged_in: Optional[bool] = False
    # Location tracking
    lat: Optional[float] = None
    lng: Optional[float] = None
    device_info: Optional[str] = None

class ForgotPasswordReq(BaseModel):
    email: str

class VerifyResetCodeReq(BaseModel):
    email: str
    code: str

class ResetPasswordReq(BaseModel):
    email: str
    code: str
    new_password: str

class VerifyCodeReq(BaseModel):
    email: str
    code: str
    type: str  # 'email' or 'phone'

class ResendVerificationReq(BaseModel):
    email: str
    type: str

class LocationInfo(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None

class JobPostCreate(BaseModel):
    title: str
    description: str
    trade_required: str
    location: Optional[str] = None
    budget: Optional[str] = None
    budget_negotiable: Optional[bool] = None
    urgency: Optional[str] = "normal"  # normal, urgent
    photos: Optional[List[str]] = None  # Up to 10 photos
    trades_required: Optional[List[str]] = None  # Array of trades

class LocationUpdate(BaseModel):
    live_location_enabled: bool
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    work_locations: Optional[List[dict]] = None

class ReviewCreate(BaseModel):
    contractor_id: str
    rating: int
    comment: str
    job_id: Optional[str] = None
    conversation_id: Optional[str] = None

class PortfolioCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    image_base64: Optional[str] = None
    images: Optional[List[str]] = []  # Array of base64 images

class ConversationCreate(BaseModel):
    participant_id: str
    job_id: Optional[str] = None

class ContractReq(BaseModel):
    contractor_name: str
    client_name: str
    job_description: str
    job_location: str
    start_date: str
    estimated_duration: str
    total_amount: float
    payment_terms: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    contractor_type: Optional[str] = None
    trades: Optional[List[str]] = None
    experience_years: Optional[int] = None
    service_radius: Optional[int] = None
    availability_hours: Optional[dict] = None
    profile_photo: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None
    license_expiry: Optional[str] = None
    license_image: Optional[str] = None

class SubscriptionReq(BaseModel):
    origin_url: str

class AdminActionReq(BaseModel):
    admin_secret: str

class OnlineStatusReq(BaseModel):
    is_online: bool
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None

class JobPostReq(BaseModel):
    category: str
    description: str
    photos: Optional[List[str]] = None
    location_lat: float
    location_lng: float
    location_address: Optional[str] = None
    urgency: Optional[str] = "normal"  # normal, urgent, flexible

class JobResponseReq(BaseModel):
    job_id: str
    action: str  # accept, ignore
    message: Optional[str] = None

class QuoteRequestReq(BaseModel):
    category: str
    description: str
    photos: Optional[List[str]] = None
    location_lat: float
    location_lng: float
    location_address: Optional[str] = None

# ── Auth Helpers ──

def hash_pw(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_pw(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(uid: str, email: str, role: str) -> str:
    return pyjwt.encode({"user_id": uid, "email": email, "role": role}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = pyjwt.decode(authorization.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

async def get_optional_user(authorization: Optional[str] = Header(None)):
    """Get user if authenticated, otherwise return None (for guest access)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = pyjwt.decode(authorization.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance in kilometers"""
    R = 6371  # Earth's radius in km
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return round(R * 2 * math.asin(math.sqrt(a)), 1)

# ── Socket.IO ──

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
connected_users = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    uid = connected_users.pop(sid, None)
    if uid:
        # Set contractor offline when disconnected
        await db.users.update_one({"id": uid, "role": "contractor"}, {"$set": {"is_online": False}})
    logger.info(f"Socket disconnected: {sid}")

@sio.event
async def authenticate(sid, data):
    uid = data.get("user_id")
    if uid:
        connected_users[sid] = uid

@sio.event
async def join_room(sid, data):
    room = data.get("room_id")
    if room:
        await sio.enter_room(sid, room)

@sio.event
async def send_message(sid, data):
    conv_id = data.get("conversation_id")
    text = (data.get("text") or "").strip()
    sender_id = connected_users.get(sid)
    if not all([conv_id, text, sender_id]):
        return
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg.copy())
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": {"last_message": text, "last_message_at": msg["created_at"]}}
    )
    await sio.emit("new_message", msg, room=conv_id)
    
    # Send push notification
    try:
        conv = await db.conversations.find_one({"id": conv_id})
        if conv:
            participants = conv.get("participants", [])
            recipient_id = next((p for p in participants if p != sender_id), None)
            if recipient_id:
                recipient = await db.users.find_one({"id": recipient_id})
                sender = await db.users.find_one({"id": sender_id})
                if recipient and recipient.get("push_token"):
                    sender_name = sender.get("name", "Someone") if sender else "Someone"
                    await send_push_notification(
                        to_token=recipient["push_token"],
                        title=f"New message from {sender_name}",
                        body=text[:100] + ("..." if len(text) > 100 else ""),
                        data={"conversation_id": conv_id, "type": "message"}
                    )
    except Exception as e:
        logger.error(f"Push notification error: {e}")

@sio.event
async def typing(sid, data):
    conv_id = data.get("conversation_id")
    uid = connected_users.get(sid)
    if conv_id and uid:
        await sio.emit("user_typing", {"user_id": uid}, room=conv_id, skip_sid=sid)

@sio.event
async def job_alert_response(sid, data):
    """Handle contractor response to job alert"""
    job_id = data.get("job_id")
    action = data.get("action")  # accept or ignore
    contractor_id = connected_users.get(sid)
    if job_id and action and contractor_id:
        await handle_job_response(job_id, contractor_id, action)

# ── FastAPI ──

fastapi_app = FastAPI(title="MiPropertyGuru API")
fastapi_app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
api_router = APIRouter(prefix="/api")

# ── Auth Routes ──

@api_router.post("/auth/register")
async def register(req: RegisterReq):
    """
    Step 1: Store pending registration and send verification code.
    Account is NOT created until code is verified via /auth/complete-registration
    """
    # Check if user already exists
    existing = await db.users.find_one({"$or": [{"email": req.email.lower()}, {"phone": req.phone}]})
    if existing:
        raise HTTPException(400, "Email or phone already registered")
    
    # Check if there's already a pending registration for this email
    existing_pending = await db.pending_registrations.find_one({"email": req.email.lower()})
    if existing_pending:
        # Delete old pending registration
        await db.pending_registrations.delete_one({"email": req.email.lower()})
    
    if req.role == "contractor" and not req.contractor_type and not req.trades:
        raise HTTPException(400, "Contractor type or trades required")
    
    # Generate verification code
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Store pending registration (NOT creating the actual account yet)
    pending_data = {
        "email": req.email.lower(),
        "name": req.name,
        "phone": req.phone,
        "password_hash": hash_pw(req.password),
        "role": req.role,
        "contractor_type": req.contractor_type if req.role == "contractor" else None,
        "trades": req.trades or ([req.contractor_type] if req.contractor_type else []),
        "bio": req.bio or "",
        "experience_years": req.experience_years or 0,
        "service_radius": req.service_radius or 15,
        "business_name": req.business_name,
        "languages": req.languages or ["English"],
        "has_license": req.has_license or False,
        "license_confirmed": req.license_confirmed or False,
        "verification_code": code,
        "code_expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pending_registrations.insert_one(pending_data)
    
    # Send ONLY the verification code email (no welcome email, no admin notification yet)
    try:
        send_verification_code(req.email, req.name, code)
        logger.info(f"Verification code sent to {req.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
    
    # Return success but NO token (user is not logged in yet)
    return {
        "message": "Verification code sent to your email",
        "email": req.email.lower(),
        "requires_verification": True
    }


class CompleteRegistrationReq(BaseModel):
    email: str
    code: str


@api_router.post("/auth/complete-registration")
async def complete_registration(req: CompleteRegistrationReq):
    """
    Step 2: Verify code and create the actual account.
    This is when welcome email and admin notification are sent.
    """
    # Find pending registration
    pending = await db.pending_registrations.find_one({"email": req.email.lower()})
    if not pending:
        raise HTTPException(400, "No pending registration found. Please register again.")
    
    # Verify code
    if pending["verification_code"] != req.code:
        raise HTTPException(400, "Invalid verification code")
    
    # Check expiry
    expires_at = datetime.fromisoformat(pending["code_expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        # Delete expired pending registration
        await db.pending_registrations.delete_one({"email": req.email.lower()})
        raise HTTPException(400, "Verification code has expired. Please register again.")
    
    # Check again if user was created in the meantime
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        await db.pending_registrations.delete_one({"email": req.email.lower()})
        raise HTTPException(400, "Account already exists. Please login instead.")
    
    # NOW create the actual user account
    uid = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    
    user = {
        "id": uid,
        "name": pending["name"],
        "email": pending["email"],
        "phone": pending["phone"],
        "password_hash": pending["password_hash"],
        "role": pending["role"],
        "contractor_type": pending.get("contractor_type"),
        "trades": pending.get("trades", []),
        "bio": pending.get("bio", ""),
        "experience_years": pending.get("experience_years", 0),
        "service_radius": pending.get("service_radius", 15),
        "business_name": pending.get("business_name"),
        "languages": pending.get("languages", ["English"]),
        "has_license": pending.get("has_license", False),
        "license_confirmed": pending.get("license_confirmed", False),
        "availability_hours": {"start": "08:00", "end": "18:00"},
        "profile_photo": None,
        "live_location_enabled": False,
        "current_location": None,
        "work_locations": [],
        "is_online": False,
        "last_online": None,
        "rating": 0,
        "review_count": 0,
        "response_rate": 100,
        "avg_response_time": 5,
        "jobs_received": 0,
        "jobs_completed": 0,
        "profile_views": 0,
        "subscription_status": "active",
        "subscription_fee": 0,
        "terms_accepted": True,
        "email_verified": True,  # Already verified!
        "phone_verified": False,
        "active_session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user.copy())
    
    # Delete pending registration
    await db.pending_registrations.delete_one({"email": req.email.lower()})
    
    # Create token
    token = create_token(uid, pending["email"], pending["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    
    # NOW send welcome email
    try:
        is_contractor = pending["role"] == "contractor"
        send_welcome_email(pending["email"], pending["name"], is_contractor)
        logger.info(f"Welcome email sent to {pending['email']}")
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
    
    # NOW send admin notification
    try:
        send_admin_new_user_notification(
            user_name=pending["name"],
            user_email=pending["email"],
            user_phone=pending["phone"],
            user_role=pending["role"],
            contractor_type=pending.get("contractor_type")
        )
        logger.info(f"Admin notification sent for new user: {pending['email']}")
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
    
    return {"token": token, "user": safe}

# Cancel registration endpoint - delete unverified account
class CancelRegistrationReq(BaseModel):
    email: str

@api_router.post("/auth/cancel-registration")
async def cancel_registration(req: CancelRegistrationReq):
    """Delete unverified account when user cancels registration"""
    # Only delete if account exists and is not verified
    user = await db.users.find_one({"email": req.email.lower()})
    if user and not user.get("email_verified", False):
        await db.users.delete_one({"email": req.email.lower()})
        await db.verification_codes.delete_many({"email": req.email.lower()})
        logger.info(f"Cancelled registration for unverified user: {req.email}")
        return {"message": "Registration cancelled"}
    return {"message": "No action needed"}

# Upgrade client to contractor
class UpgradeToContractorReq(BaseModel):
    name: str
    phone: str
    business_name: Optional[str] = None
    trades: List[str] = []
    languages: List[str] = ["English"]
    service_radius: int = 15
    bio: Optional[str] = None
    experience_years: Optional[int] = 0
    has_license: Optional[bool] = False
    license_confirmed: Optional[bool] = False
    use_same_password: bool = True  # If true, keep existing password
    new_password: Optional[str] = None  # Only required if use_same_password is False

@api_router.post("/auth/upgrade-to-contractor")
async def upgrade_to_contractor(req: UpgradeToContractorReq, user=Depends(get_current_user)):
    """Upgrade an existing client account to a contractor account"""
    
    # Verify user is a client
    if user.get("role") == "contractor":
        raise HTTPException(400, "User is already a contractor")
    
    # Validate new password if not using same
    if not req.use_same_password:
        if not req.new_password or len(req.new_password) < 6:
            raise HTTPException(400, "New password must be at least 6 characters")
    
    if not req.trades or len(req.trades) == 0:
        raise HTTPException(400, "At least one trade is required")
    
    # Prepare update data
    update_data = {
        "name": req.name,
        "phone": req.phone,
        "role": "contractor",
        "business_name": req.business_name,
        "trades": req.trades,
        "languages": req.languages,
        "service_radius": req.service_radius,
        "bio": req.bio or "",
        "experience_years": req.experience_years or 0,
        "has_license": req.has_license or False,
        "license_confirmed": req.license_confirmed or False,
        "is_online": False,
        "work_locations": user.get("work_locations", []),
        "rating": 0,
        "review_count": 0,
        "response_rate": 100,
        "avg_response_time": 5,
        "jobs_received": 0,
        "jobs_completed": 0,
        "profile_views": 0,
    }
    
    # Update password if new one provided
    if not req.use_same_password and req.new_password:
        update_data["password_hash"] = hash_pw(req.new_password)
    
    # Update user in database
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    
    # Create new token with contractor role
    token = create_token(user["id"], user["email"], "contractor")
    
    # Send admin notification about upgrade to contractor
    try:
        send_admin_new_user_notification(
            user_name=req.name,
            user_email=user["email"],
            user_phone=req.phone,
            user_role="contractor",
            contractor_type=req.trades[0] if req.trades else None
        )
        logger.info(f"Admin notification sent for client upgrade to contractor: {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send admin notification for upgrade: {e}")
    
    # Send welcome email to the new contractor
    try:
        send_contractor_upgrade_email(user["email"], req.name)
        logger.info(f"Contractor welcome email sent to: {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send contractor welcome email: {e}")
    
    return {"token": token, "user": updated_user}

@api_router.post("/auth/login")
async def login(req: LoginReq, request: Request):
    query = {}
    if req.email:
        query["email"] = req.email
    elif req.phone:
        query["phone"] = req.phone
    else:
        raise HTTPException(400, "Email or phone required")
    
    user = await db.users.find_one(query, {"_id": 0})
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    
    # Generate new session ID - this invalidates any previous sessions
    new_session_id = str(uuid.uuid4())
    
    # Get IP address from request
    ip_address = request.client.host if request.client else None
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    
    # Location tracking - check for suspicious activity
    suspicious_activity = False
    suspicious_reasons = []
    
    # Get previous login history
    login_history = user.get("login_history", [])
    
    if login_history and len(login_history) > 0:
        last_login = login_history[-1]
        last_login_time = datetime.fromisoformat(last_login.get("timestamp", "2020-01-01T00:00:00+00:00").replace('Z', '+00:00'))
        time_diff_minutes = (datetime.now(timezone.utc) - last_login_time).total_seconds() / 60
        
        # Check for rapid location change (impossible travel)
        if req.lat and req.lng and last_login.get("lat") and last_login.get("lng"):
            # Calculate distance between locations
            lat1, lng1 = last_login.get("lat"), last_login.get("lng")
            lat2, lng2 = req.lat, req.lng
            
            # Haversine formula for distance
            R = 6371  # Earth radius in km
            dlat = math.radians(lat2 - lat1)
            dlng = math.radians(lng2 - lng1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            distance_km = R * c
            
            # If distance > 500km in less than 60 minutes, flag as suspicious
            if distance_km > 500 and time_diff_minutes < 60:
                suspicious_activity = True
                suspicious_reasons.append(f"Rapid location change: {distance_km:.0f}km in {time_diff_minutes:.0f} minutes")
        
        # Check for multiple IPs in short time
        if ip_address and last_login.get("ip_address") and ip_address != last_login.get("ip_address"):
            if time_diff_minutes < 5:
                suspicious_activity = True
                suspicious_reasons.append(f"Multiple IP addresses in {time_diff_minutes:.0f} minutes")
    
    # Create login record
    login_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": ip_address,
        "lat": req.lat,
        "lng": req.lng,
        "device_info": req.device_info,
        "suspicious": suspicious_activity,
        "suspicious_reasons": suspicious_reasons
    }
    
    # Update user with new session and login history (keep last 10 logins)
    updated_login_history = (login_history + [login_record])[-10:]
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "active_session_id": new_session_id,
            "last_login": datetime.now(timezone.utc).isoformat(),
            "last_ip_address": ip_address,
            "last_location": {"lat": req.lat, "lng": req.lng} if req.lat and req.lng else None,
            "login_history": updated_login_history,
            "suspicious_activity_flagged": suspicious_activity
        }}
    )
    
    # Log suspicious activity
    if suspicious_activity:
        logger.warning(f"Suspicious login detected for user {user['id']}: {suspicious_reasons}")
        # Store in suspicious_activity collection for review
        await db.suspicious_activity.insert_one({
            "user_id": user["id"],
            "user_email": user.get("email"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reasons": suspicious_reasons,
            "login_record": login_record
        })
    
    token = create_token(user["id"], user.get("email") or user["phone"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    safe["active_session_id"] = new_session_id
    
    return {
        "token": token, 
        "user": safe,
        "session_id": new_session_id,
        "suspicious_activity": suspicious_activity,
        "suspicious_reasons": suspicious_reasons if suspicious_activity else None
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ── Password Reset & Verification ──

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordReq):
    """Send password reset code to user's email"""
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email is registered, you will receive a reset code"}
    
    # Generate 6-digit code
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    # Store the code in database
    await db.password_resets.update_one(
        {"email": req.email.lower()},
        {"$set": {
            "email": req.email.lower(),
            "code": code,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Send password reset email with the code
    try:
        send_password_reset_email(req.email.lower(), user.get("name", "User"), code)
        logger.info(f"Password reset email sent to {req.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {
        "message": "Verification code sent to your email"
    }

@api_router.post("/auth/verify-reset-code")
async def verify_reset_code(req: VerifyResetCodeReq):
    """Verify the password reset code"""
    reset_record = await db.password_resets.find_one({"email": req.email.lower()})
    
    if not reset_record:
        raise HTTPException(400, "No reset code found. Please request a new one.")
    
    if reset_record["code"] != req.code:
        raise HTTPException(400, "Invalid verification code")
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "Code has expired. Please request a new one.")
    
    return {"message": "Code verified", "valid": True}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordReq):
    """Reset password with verified code"""
    reset_record = await db.password_resets.find_one({"email": req.email.lower()})
    
    if not reset_record:
        raise HTTPException(400, "No reset code found")
    
    if reset_record["code"] != req.code:
        raise HTTPException(400, "Invalid verification code")
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "Code has expired")
    
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    
    # Get user name for email
    user = await db.users.find_one({"email": req.email.lower()})
    user_name = user.get("name", "User") if user else "User"
    
    # Update password
    await db.users.update_one(
        {"email": req.email.lower()},
        {"$set": {"password_hash": hash_pw(req.new_password)}}
    )
    
    # Delete the reset record
    await db.password_resets.delete_one({"email": req.email.lower()})
    
    # Send password changed notification email
    try:
        send_password_changed_email(req.email.lower(), user_name)
        logger.info(f"Password changed notification sent to {req.email}")
    except Exception as e:
        logger.error(f"Failed to send password changed email: {e}")
    
    return {"message": "Password reset successfully"}

@api_router.post("/auth/verify-code")
async def verify_email_or_phone(req: VerifyCodeReq):
    """Verify email or phone with code"""
    verify_record = await db.verification_codes.find_one({
        "email": req.email.lower(),
        "type": req.type
    })
    
    if not verify_record:
        raise HTTPException(400, "No verification code found")
    
    if verify_record["code"] != req.code:
        raise HTTPException(400, "Invalid verification code")
    
    expires_at = datetime.fromisoformat(verify_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "Code has expired")
    
    # Update user's verified status
    update_field = "email_verified" if req.type == "email" else "phone_verified"
    await db.users.update_one(
        {"email": req.email.lower()},
        {"$set": {update_field: True}}
    )
    
    # Delete the verification record
    await db.verification_codes.delete_one({
        "email": req.email.lower(),
        "type": req.type
    })
    
    return {"message": f"{req.type.capitalize()} verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(req: ResendVerificationReq):
    """Resend verification code"""
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(404, "User not found")
    
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.verification_codes.update_one(
        {"email": req.email.lower(), "type": req.type},
        {"$set": {
            "email": req.email.lower(),
            "type": req.type,
            "code": code,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Send verification code email
    try:
        send_verification_code(req.email.lower(), user.get("name", "User"), code)
        logger.info(f"Verification email sent to {req.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
    
    return {
        "message": f"Verification code sent to your {req.type}"
    }

# ── Support Contact Endpoint ──

class SupportContactReq(BaseModel):
    subject: str
    message: str
    name: Optional[str] = None
    email: Optional[str] = None

@api_router.post("/support/contact")
async def contact_support(req: SupportContactReq, user=Depends(get_current_user)):
    """Send a support request email"""
    user_name = req.name or user.get("name", "User")
    user_email = req.email or user.get("email", "")
    
    if not user_email:
        raise HTTPException(400, "Email is required")
    
    # Send support email to admin
    try:
        send_support_email(user_email, user_name, req.subject, req.message)
        # Send confirmation to user
        send_support_confirmation(user_email, user_name, req.subject)
        logger.info(f"Support request from {user_email}: {req.subject}")
    except Exception as e:
        logger.error(f"Failed to send support email: {e}")
        raise HTTPException(500, "Failed to send support request")
    
    # Store support request in database
    await db.support_requests.insert_one({
        "user_id": user["id"],
        "user_name": user_name,
        "user_email": user_email,
        "subject": req.subject,
        "message": req.message,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Support request sent successfully", "success": True}

@api_router.post("/support/contact-guest")
async def contact_support_guest(req: SupportContactReq):
    """Send a support request email (for non-logged in users)"""
    if not req.email or not req.name:
        raise HTTPException(400, "Name and email are required")
    
    # Send support email to admin
    try:
        send_support_email(req.email, req.name, req.subject, req.message)
        # Send confirmation to user
        send_support_confirmation(req.email, req.name, req.subject)
        logger.info(f"Guest support request from {req.email}: {req.subject}")
    except Exception as e:
        logger.error(f"Failed to send support email: {e}")
        raise HTTPException(500, "Failed to send support request")
    
    # Store support request in database
    await db.support_requests.insert_one({
        "user_id": None,
        "user_name": req.name,
        "user_email": req.email,
        "subject": req.subject,
        "message": req.message,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Support request sent successfully", "success": True}

@api_router.post("/switch-mode")
async def switch_mode_api(user=Depends(get_current_user)):
    """Toggle between contractor and client mode"""
    return {"message": "Mode switched", "success": True}

# ── Suspicious Activity Endpoints ──

@api_router.get("/security/suspicious-activity")
async def get_suspicious_activity(user=Depends(get_current_user)):
    """Get suspicious activity logs for the current user"""
    activities = await db.suspicious_activity.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    return {"activities": activities}

@api_router.get("/security/login-history")
async def get_login_history(user=Depends(get_current_user)):
    """Get login history for the current user"""
    user_data = await db.users.find_one({"id": user["id"]}, {"login_history": 1})
    login_history = user_data.get("login_history", []) if user_data else []
    return {"login_history": login_history}

@api_router.post("/security/report-suspicious")
async def report_suspicious_activity(user=Depends(get_current_user)):
    """User reports their account may be compromised - invalidates all sessions"""
    new_session_id = str(uuid.uuid4())
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "active_session_id": new_session_id,
            "suspicious_activity_flagged": True,
            "security_alert_timestamp": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.suspicious_activity.insert_one({
        "user_id": user["id"],
        "user_email": user.get("email"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reasons": ["User reported suspicious activity"],
        "reported_by_user": True
    })
    return {"message": "All other sessions have been logged out. Please change your password.", "new_session_id": new_session_id}

# ── Admin Endpoints ──

@api_router.get("/admin/users")
async def get_all_users(
    role: Optional[str] = None,
    admin_secret: str = Header(None, alias="X-Admin-Secret")
):
    """Get all registered users with optional role filter"""
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(401, "Invalid admin credentials")
    
    query = {}
    if role and role in ['client', 'contractor']:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    
    # Add computed fields
    for user in users:
        user["is_contractor_as_client"] = user.get("role") == "contractor"
        user["has_switched_modes"] = user.get("role") == "contractor"  # Contractors can switch
        
    # Stats
    total_users = len(users)
    pure_clients = len([u for u in users if u.get("role") == "client"])
    contractors = len([u for u in users if u.get("role") == "contractor"])
    
    return {
        "users": users,
        "stats": {
            "total": total_users,
            "pure_clients": pure_clients,
            "contractors": contractors,
            "contractors_can_be_clients": contractors  # All contractors can switch to client mode
        }
    }

@api_router.get("/admin/users/{user_id}")
async def get_user_detail(user_id: str, admin_secret: str = Header(None, alias="X-Admin-Secret")):
    """Get detailed info about a specific user"""
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(401, "Invalid admin credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    # Get login history
    login_history = user.get("login_history", [])
    
    # Get suspicious activities
    suspicious = await db.suspicious_activity.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    return {
        "user": user,
        "login_history": login_history,
        "suspicious_activities": suspicious
    }

@api_router.get("/admin/stats")
async def get_admin_stats(admin_secret: str = Header(None, alias="X-Admin-Secret")):
    """Get overall platform statistics"""
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(401, "Invalid admin credentials")
    
    total_users = await db.users.count_documents({})
    total_clients = await db.users.count_documents({"role": "client"})
    total_contractors = await db.users.count_documents({"role": "contractor"})
    active_contractors = await db.users.count_documents({"role": "contractor", "subscription_status": "active"})
    verified_emails = await db.users.count_documents({"email_verified": True})
    with_license = await db.users.count_documents({"has_license": True})
    suspicious_flags = await db.suspicious_activity.count_documents({})
    
    # Recent registrations (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "total_users": total_users,
        "clients": total_clients,
        "contractors": total_contractors,
        "active_contractors": active_contractors,
        "verified_emails": verified_emails,
        "contractors_with_license": with_license,
        "suspicious_activity_flags": suspicious_flags,
        "registrations_last_7_days": recent_users
    }

# ── Job Posting Routes ──

@api_router.post("/jobs/post")
async def post_job(req: JobPostCreate, user=Depends(get_current_user)):
    """Post a new job - clients can post jobs for contractors to see"""
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "title": req.title,
        "description": req.description,
        "trade_required": req.trade_required,
        "trades_required": req.trades_required or [],
        "location": req.location,
        "budget": req.budget,
        "budget_negotiable": req.budget_negotiable,
        "urgency": req.urgency or "normal",
        "status": "open",  # open, in_progress, completed, cancelled
        "posted_by": user["id"],
        "posted_by_name": user.get("name", "Client"),
        "posted_by_email": user.get("email"),
        "posted_by_phone": user.get("phone"),
        "responses": [],  # Contractors who responded
        "dismissed_by": [],  # Initialize dismissed_by array
        "photos": (req.photos or [])[:10],  # Limit to 10 photos
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posted_jobs.insert_one(job.copy())
    
    logger.info(f"Job posted: {job['title']} for {job['trade_required']} by {user.get('name')}")
    
    return {"job": job, "message": "Job posted successfully"}

@api_router.get("/jobs/posted")
@api_router.get("/jobs/my-posted")
async def get_my_posted_jobs(user=Depends(get_current_user)):
    """Get jobs posted by the current user"""
    jobs = await db.posted_jobs.find(
        {"posted_by": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"jobs": jobs}

@api_router.get("/jobs/available")
async def get_available_jobs(user=Depends(get_current_user)):
    """Get jobs available for the contractor based on their trades - excludes their own posted jobs and dismissed jobs"""
    user_trades = user.get("trades", []) or []
    if user.get("contractor_type"):
        user_trades.append(user["contractor_type"])
    
    # Remove duplicates
    user_trades = list(set(user_trades))
    
    logger.info(f"User {user.get('name')} looking for jobs. Trades: {user_trades}")
    
    # Get open jobs that match contractor's trades, excluding:
    # 1. Jobs they posted themselves
    # 2. Jobs they've dismissed
    # Match using either:
    # - trades_required array (for newer jobs) - checks if any overlap exists
    # - trade_required string (for older jobs) - checks if contractor's trade matches the string or is contained in comma-separated values
    
    # Build the query conditions for trade matching
    trade_conditions = []
    
    # Condition 1: trades_required array intersection
    trade_conditions.append({"trades_required": {"$in": user_trades}})
    
    # Condition 2: trade_required string matching (for each user trade)
    for trade in user_trades:
        trade_conditions.append({"trade_required": trade})  # Exact match
        trade_conditions.append({"trade_required": {"$regex": f"\\b{trade}\\b", "$options": "i"}})  # Word boundary match for comma-separated
    
    jobs = await db.posted_jobs.find(
        {
            "status": "open",
            "$or": trade_conditions,
            "posted_by": {"$ne": user["id"]},  # Exclude jobs posted by this user
            "$and": [
                {"$or": [
                    {"dismissed_by": {"$exists": False}},
                    {"dismissed_by": {"$nin": [user["id"]]}}
                ]}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    logger.info(f"Found {len(jobs)} jobs for {user.get('name')}")
    
    return {"jobs": jobs}

@api_router.post("/jobs/{job_id}/respond")
async def respond_to_job(job_id: str, user=Depends(get_current_user)):
    """Contractor responds/applies to a job"""
    job = await db.posted_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    
    if job["posted_by"] == user["id"]:
        raise HTTPException(400, "You cannot respond to your own job")
    
    # Check if already responded
    existing_responses = job.get("responses", [])
    if any(r["contractor_id"] == user["id"] for r in existing_responses):
        raise HTTPException(400, "You have already responded to this job")
    
    response = {
        "contractor_id": user["id"],
        "contractor_name": user.get("name"),
        "contractor_type": user.get("contractor_type"),
        "responded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posted_jobs.update_one(
        {"id": job_id},
        {"$push": {"responses": response}}
    )
    
    return {"message": "Response sent successfully"}

@api_router.post("/jobs/{job_id}/dismiss")
async def dismiss_job(job_id: str, user=Depends(get_current_user)):
    """Contractor dismisses/ignores a job - it won't show up in their feed again"""
    job = await db.posted_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Add user to dismissed_by list
    await db.posted_jobs.update_one(
        {"id": job_id},
        {"$addToSet": {"dismissed_by": user["id"]}}
    )
    
    return {"message": "Job dismissed"}

# ── Categories ──

@api_router.get("/categories")
async def get_categories():
    """Get all categories with icons and counts"""
    categories = []
    for cat in CONTRACTOR_TYPES:
        count = await db.users.count_documents({
            "role": "contractor", 
            "subscription_status": "active",
            "$or": [{"contractor_type": cat}, {"trades": cat}]
        })
        categories.append({
            "name": cat,
            "icon": CATEGORY_ICONS.get(cat, "🔧"),
            "contractor_count": count
        })
    return {"categories": categories}

@api_router.get("/contractor-types")
async def get_types():
    return {"types": CONTRACTOR_TYPES}

# ── Contractor Routes ──

@api_router.get("/contractors")
async def list_contractors(
    category: Optional[str] = None, 
    lat: Optional[float] = None, 
    lng: Optional[float] = None,
    online_only: Optional[bool] = False,
    max_distance: Optional[int] = None
):
    q = {"role": "contractor", "subscription_status": "active"}
    if category and category != "All":
        q["$or"] = [{"contractor_type": category}, {"trades": category}]
    if online_only:
        q["is_online"] = True
    
    contractors = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(100)
    
    if lat is not None and lng is not None:
        for c in contractors:
            clat, clng = None, None
            if c.get("is_online") and c.get("current_location"):
                clat = c["current_location"].get("lat")
                clng = c["current_location"].get("lng")
            elif c.get("work_locations") and len(c["work_locations"]) > 0:
                clat = c["work_locations"][0].get("lat")
                clng = c["work_locations"][0].get("lng")
            c["distance_km"] = haversine_km(lat, lng, clat, clng) if (clat and clng) else 999
        
        # Filter by max distance if specified
        if max_distance:
            contractors = [c for c in contractors if c.get("distance_km", 999) <= max_distance]
        
        contractors.sort(key=lambda x: x.get("distance_km", 999))
    
    # Add online contractors count
    online_count = await db.users.count_documents({"role": "contractor", "subscription_status": "active", "is_online": True})
    
    return {"contractors": contractors, "online_count": online_count}

@api_router.get("/contractors/available")
async def get_available_contractors(lat: float, lng: float, category: Optional[str] = None):
    """Get available (online) contractors near a location"""
    q = {"role": "contractor", "subscription_status": "active", "is_online": True}
    if category and category != "All":
        q["$or"] = [{"contractor_type": category}, {"trades": category}]
    
    contractors = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(50)
    
    result = []
    for c in contractors:
        clat, clng = None, None
        if c.get("current_location"):
            clat = c["current_location"].get("lat")
            clng = c["current_location"].get("lng")
        elif c.get("work_locations"):
            clat = c["work_locations"][0].get("lat")
            clng = c["work_locations"][0].get("lng")
        
        if clat and clng:
            distance = haversine_km(lat, lng, clat, clng)
            service_radius = c.get("service_radius", 15)
            if distance <= service_radius:
                c["distance_km"] = distance
                result.append(c)
    
    result.sort(key=lambda x: (x.get("distance_km", 999), -x.get("rating", 0)))
    return {"contractors": result, "count": len(result)}

@api_router.get("/contractors/{cid}")
async def get_contractor(cid: str, user=Depends(get_optional_user)):
    c = await db.users.find_one({"id": cid, "role": "contractor"}, {"_id": 0, "password_hash": 0})
    if not c:
        raise HTTPException(404, "Not found")
    
    # Increment profile views
    await db.users.update_one({"id": cid}, {"$inc": {"profile_views": 1}})
    
    reviews = await db.reviews.find({"contractor_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    portfolio = await db.portfolio.find({"contractor_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"contractor": c, "reviews": reviews, "portfolio": portfolio}

@api_router.put("/contractors/location")
async def update_location(req: LocationUpdate, user=Depends(get_current_user)):
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    update: dict = {"live_location_enabled": req.live_location_enabled}
    if req.live_location_enabled and req.current_lat and req.current_lng:
        update["current_location"] = {"lat": req.current_lat, "lng": req.current_lng}
    if req.work_locations is not None:
        update["work_locations"] = req.work_locations[:3]
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {"message": "Location updated"}

@api_router.put("/contractors/online-status")
async def update_online_status(req: OnlineStatusReq, user=Depends(get_current_user)):
    """Toggle contractor online/offline status"""
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    
    update = {
        "is_online": req.is_online,
        "last_online": datetime.now(timezone.utc).isoformat()
    }
    if req.is_online and req.current_lat and req.current_lng:
        update["current_location"] = {"lat": req.current_lat, "lng": req.current_lng}
        update["live_location_enabled"] = True
    
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    
    status_text = "You are live" if req.is_online else "You are offline"
    return {"message": status_text, "is_online": req.is_online}

class ServiceRadiusReq(BaseModel):
    service_radius: int

@api_router.put("/contractors/service-radius")
async def update_service_radius(req: ServiceRadiusReq, user=Depends(get_current_user)):
    """Update contractor service radius in km"""
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    
    # Clamp between 0 and 200
    radius = max(0, min(200, req.service_radius))
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"service_radius": radius}})
    return {"message": "Service radius updated", "service_radius": radius}

@api_router.put("/contractors/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    update = {}
    for k, v in req.model_dump().items():
        if v is not None:
            update[k] = v
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

# User profile update (for clients - name and phone only)
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

@api_router.put("/users/profile")
async def update_user_profile(req: UserProfileUpdate, user=Depends(get_current_user)):
    """Update user profile - clients can only update name and phone"""
    update = {}
    if req.name is not None:
        update["name"] = req.name
    if req.phone is not None:
        update["phone"] = req.phone
    
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.get("/contractors/stats")
async def get_contractor_stats(user=Depends(get_current_user)):
    """Get contractor dashboard stats"""
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    
    # Get jobs received this week
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    jobs_this_week = await db.jobs.count_documents({
        "contractor_alerts.contractor_id": user["id"],
        "created_at": {"$gte": week_ago}
    })
    
    return {
        "jobs_received_this_week": jobs_this_week,
        "profile_views": user.get("profile_views", 0),
        "response_rate": user.get("response_rate", 100),
        "avg_response_time": user.get("avg_response_time", 5),
        "rating": user.get("rating", 0),
        "review_count": user.get("review_count", 0),
        "jobs_completed": user.get("jobs_completed", 0),
        "is_online": user.get("is_online", False)
    }

# ── Role Switching ──

@api_router.post("/switch-to-client-mode")
async def switch_to_client_mode(user=Depends(get_current_user)):
    """Allow contractor to switch to client mode"""
    if user["role"] != "contractor":
        raise HTTPException(400, "Only contractors can switch to client mode")
    
    # Contractor keeps their account but can act as client
    # We just return a flag indicating they're in client mode
    return {
        "message": "Switched to client mode",
        "mode": "client",
        "can_hire": True,
        "can_get_jobs": True  # Contractor still has full access
    }

@api_router.post("/switch-to-contractor-mode")
async def switch_to_contractor_mode(user=Depends(get_current_user)):
    """Switch back to contractor mode"""
    if user["role"] != "contractor":
        raise HTTPException(400, "Only contractors can switch modes")
    return {
        "message": "Switched to contractor mode",
        "mode": "contractor",
        "can_hire": True,
        "can_get_jobs": True
    }

# ── Jobs System ──

@api_router.post("/jobs")
async def post_job(req: JobPostReq, user=Depends(get_current_user)):
    """Client posts a job - triggers job alerts to contractors"""
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "client_id": user["id"],
        "client_name": user["name"],
        "client_phone": user.get("phone"),
        "category": req.category,
        "description": req.description,
        "photos": req.photos or [],
        "location": {"lat": req.location_lat, "lng": req.location_lng},
        "location_address": req.location_address,
        "urgency": req.urgency,
        "status": "open",  # open, in_progress, completed, cancelled
        "contractor_alerts": [],  # contractors who received alert
        "contractor_responses": [],  # contractors who responded
        "selected_contractor_id": None,
        "wave": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.jobs.insert_one(job.copy())
    
    # Trigger job alerts (Wave 1)
    asyncio.create_task(send_job_alerts(job))
    
    return {"job": job, "message": "Job posted! Waiting for contractors..."}

@api_router.get("/jobs")
async def list_jobs(user=Depends(get_current_user)):
    """Get jobs posted by client or received by contractor"""
    if user["role"] == "client" or (user["role"] == "contractor"):
        # Client sees their posted jobs
        jobs = await db.jobs.find({"client_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"jobs": jobs}

@api_router.get("/jobs/incoming")
async def get_incoming_jobs(user=Depends(get_current_user)):
    """Get incoming job alerts for contractor"""
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    
    # Get jobs where this contractor was alerted and hasn't responded yet
    jobs = await db.jobs.find({
        "contractor_alerts.contractor_id": user["id"],
        "status": "open",
        "contractor_responses.contractor_id": {"$ne": user["id"]}
    }, {"_id": 0}).sort("created_at", -1).to_list(20)
    
    # Add distance to each job
    if user.get("current_location"):
        for job in jobs:
            job_loc = job.get("location", {})
            if job_loc.get("lat") and job_loc.get("lng"):
                job["distance_km"] = haversine_km(
                    user["current_location"]["lat"],
                    user["current_location"]["lng"],
                    job_loc["lat"],
                    job_loc["lng"]
                )
    
    return {"jobs": jobs}

@api_router.post("/jobs/respond")
async def respond_to_job(req: JobResponseReq, user=Depends(get_current_user)):
    """Contractor accepts or ignores a job"""
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    
    job = await db.jobs.find_one({"id": req.job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    
    response = {
        "contractor_id": user["id"],
        "contractor_name": user["name"],
        "action": req.action,
        "message": req.message,
        "responded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jobs.update_one(
        {"id": req.job_id},
        {"$push": {"contractor_responses": response}}
    )
    
    if req.action == "accept":
        # Notify client
        client = await db.users.find_one({"id": job["client_id"]})
        if client and client.get("push_token"):
            await send_push_notification(
                to_token=client["push_token"],
                title="Contractor interested!",
                body=f"{user['name']} wants to help with your job",
                data={"job_id": req.job_id, "type": "job_response"}
            )
        
        # Update contractor stats
        await db.users.update_one({"id": user["id"]}, {"$inc": {"jobs_received": 1}})
    
    return {"message": f"Job {req.action}ed", "response": response}

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    """Get job details with responses"""
    # Try posted_jobs first
    job = await db.posted_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        # Fallback to old jobs collection
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Get contractor details for responses
    responses_with_details = []
    for resp in job.get("contractor_responses", []):
        if resp.get("action") == "accept":
            contractor = await db.users.find_one(
                {"id": resp["contractor_id"]}, 
                {"_id": 0, "password_hash": 0}
            )
            resp["contractor"] = contractor
            responses_with_details.append(resp)
    
    job["contractor_responses"] = responses_with_details
    return {"job": job}

class JobUpdate(BaseModel):
    description: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    budget_negotiable: Optional[bool] = None
    trade_required: Optional[str] = None
    trades_required: Optional[List[str]] = None
    photos: Optional[List[str]] = None

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, data: JobUpdate, user=Depends(get_current_user)):
    """Update a job (only by the poster)"""
    job = await db.posted_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    if job["posted_by"] != user["id"]:
        raise HTTPException(403, "Not authorized to edit this job")
    
    update_data = {}
    if data.description is not None:
        update_data["description"] = data.description
    if data.location is not None:
        update_data["location"] = data.location
    if data.budget is not None:
        update_data["budget"] = data.budget
    if data.budget_negotiable is not None:
        update_data["budget_negotiable"] = data.budget_negotiable
    if data.trade_required is not None:
        update_data["trade_required"] = data.trade_required
    if data.trades_required is not None:
        update_data["trades_required"] = data.trades_required
    if data.photos is not None:
        # Limit to 10 photos
        update_data["photos"] = data.photos[:10]
    
    if update_data:
        await db.posted_jobs.update_one({"id": job_id}, {"$set": update_data})
    
    updated_job = await db.posted_jobs.find_one({"id": job_id}, {"_id": 0})
    return {"job": updated_job}

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user=Depends(get_current_user)):
    """Delete a job (only by the poster, and only if not confirmed)"""
    job = await db.posted_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    if job["posted_by"] != user["id"]:
        raise HTTPException(403, "Not authorized to delete this job")
    if job.get("status") in ["confirmed", "completed"]:
        raise HTTPException(400, "Cannot delete a confirmed or completed job")
    
    await db.posted_jobs.delete_one({"id": job_id})
    return {"message": "Job deleted"}

@api_router.post("/jobs/{job_id}/select")
async def select_contractor(job_id: str, contractor_id: str, user=Depends(get_current_user)):
    """Client selects a contractor for their job"""
    job = await db.jobs.find_one({"id": job_id})
    if not job or job["client_id"] != user["id"]:
        raise HTTPException(404, "Job not found")
    
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"selected_contractor_id": contractor_id, "status": "in_progress"}}
    )
    
    # Notify contractor
    contractor = await db.users.find_one({"id": contractor_id})
    if contractor and contractor.get("push_token"):
        await send_push_notification(
            to_token=contractor["push_token"],
            title="You got the job!",
            body=f"{user['name']} selected you for their job",
            data={"job_id": job_id, "type": "job_selected"}
        )
    
    # Create conversation between client and contractor
    existing = await db.conversations.find_one({
        "$or": [
            {"participant_1": user["id"], "participant_2": contractor_id},
            {"participant_1": contractor_id, "participant_2": user["id"]}
        ]
    })
    
    if not existing:
        conv = {
            "id": str(uuid.uuid4()),
            "participant_1": user["id"], 
            "participant_2": contractor_id,
            "participants": [user["id"], contractor_id],
            "participant_1_name": user["name"], 
            "participant_2_name": contractor["name"],
            "participant_1_role": user["role"], 
            "participant_2_role": "contractor",
            "job_id": job_id,
            "last_message": f"Job started: {job['category']}", 
            "last_message_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conv.copy())
    
    return {"message": "Contractor selected", "status": "in_progress"}

async def send_job_alerts(job: dict):
    """Send job alerts to nearby contractors in waves"""
    category = job["category"]
    job_lat = job["location"]["lat"]
    job_lng = job["location"]["lng"]
    
    # Wave 1: Online contractors, same category, within their service radius
    wave1_contractors = await db.users.find({
        "role": "contractor",
        "subscription_status": "active",
        "is_online": True,
        "$or": [{"contractor_type": category}, {"trades": category}]
    }, {"_id": 0}).to_list(50)
    
    alerted = []
    for c in wave1_contractors:
        clat, clng = None, None
        if c.get("current_location"):
            clat = c["current_location"]["lat"]
            clng = c["current_location"]["lng"]
        elif c.get("work_locations"):
            clat = c["work_locations"][0].get("lat")
            clng = c["work_locations"][0].get("lng")
        
        if clat and clng:
            distance = haversine_km(job_lat, job_lng, clat, clng)
            service_radius = c.get("service_radius", 15)
            
            if distance <= service_radius:
                alerted.append({
                    "contractor_id": c["id"],
                    "distance_km": distance,
                    "wave": 1,
                    "alerted_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Send push notification
                if c.get("push_token"):
                    await send_push_notification(
                        to_token=c["push_token"],
                        title=f"New job: {category}",
                        body=f"{job['description'][:50]}... - {distance} km away",
                        data={"job_id": job["id"], "type": "job_alert"}
                    )
                
                # Emit socket event
                await sio.emit("job_alert", {
                    "job": job,
                    "distance_km": distance
                }, room=f"contractor_{c['id']}")
    
    # Sort by distance and rating
    alerted.sort(key=lambda x: x["distance_km"])
    
    # Update job with alerted contractors
    await db.jobs.update_one(
        {"id": job["id"]},
        {"$set": {"contractor_alerts": alerted[:10]}}  # Top 10 from wave 1
    )
    
    logger.info(f"Job {job['id']}: Alerted {len(alerted)} contractors in wave 1")

async def handle_job_response(job_id: str, contractor_id: str, action: str):
    """Handle contractor's response to job alert"""
    response = {
        "contractor_id": contractor_id,
        "action": action,
        "responded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.jobs.update_one(
        {"id": job_id},
        {"$push": {"contractor_responses": response}}
    )

# ── Quote Requests ──

@api_router.post("/quotes/request")
async def request_quotes(req: QuoteRequestReq, user=Depends(get_current_user)):
    """Client requests quotes from multiple contractors"""
    quote_id = str(uuid.uuid4())
    quote_request = {
        "id": quote_id,
        "client_id": user["id"],
        "client_name": user["name"],
        "category": req.category,
        "description": req.description,
        "photos": req.photos or [],
        "location": {"lat": req.location_lat, "lng": req.location_lng},
        "location_address": req.location_address,
        "status": "open",
        "quotes": [],  # Contractors' quotes
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quote_requests.insert_one(quote_request.copy())
    
    # Notify relevant contractors
    asyncio.create_task(notify_contractors_for_quote(quote_request))
    
    return {"quote_request": quote_request, "message": "Quote request sent!"}

async def notify_contractors_for_quote(quote_request: dict):
    """Notify contractors about quote request"""
    contractors = await db.users.find({
        "role": "contractor",
        "subscription_status": "active",
        "$or": [
            {"contractor_type": quote_request["category"]},
            {"trades": quote_request["category"]}
        ]
    }, {"_id": 0}).to_list(50)
    
    for c in contractors:
        if c.get("push_token"):
            await send_push_notification(
                to_token=c["push_token"],
                title="Quote request",
                body=f"New {quote_request['category']} job needs quotes",
                data={"quote_id": quote_request["id"], "type": "quote_request"}
            )

# ── Reviews ──

@api_router.post("/reviews")
async def create_review(req: ReviewCreate, user=Depends(get_current_user)):
    review = {
        "id": str(uuid.uuid4()), 
        "contractor_id": req.contractor_id,
        "client_id": user["id"], 
        "client_name": user["name"],
        "rating": max(1, min(5, req.rating)), 
        "comment": req.comment,
        "job_id": req.job_id,
        "conversation_id": req.conversation_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review.copy())
    
    # Update contractor rating
    pipeline = [
        {"$match": {"contractor_id": req.contractor_id}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    avg = result[0]["avg_rating"] if result else 0
    count = result[0]["count"] if result else 0
    await db.users.update_one(
        {"id": req.contractor_id}, 
        {"$set": {"rating": round(avg, 1), "review_count": count}}
    )
    
    # Update jobs_completed if job_id provided
    if req.job_id:
        await db.jobs.update_one({"id": req.job_id}, {"$set": {"status": "completed"}})
        await db.users.update_one({"id": req.contractor_id}, {"$inc": {"jobs_completed": 1}})
    
    # Mark conversation as reviewed if conversation_id provided
    if req.conversation_id:
        await db.conversations.update_one(
            {"id": req.conversation_id},
            {"$set": {"hasReview": True}}
        )
    
    return review

@api_router.get("/reviews/{cid}")
async def get_reviews(cid: str):
    return {"reviews": await db.reviews.find({"contractor_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)}


@api_router.post("/conversations/{cid}/mark-reviewed")
async def mark_conversation_reviewed(cid: str, user=Depends(get_current_user)):
    """Mark a conversation as reviewed (after client submits a review)"""
    await db.conversations.update_one(
        {"id": cid},
        {"$set": {"hasReview": True}}
    )
    return {"success": True}


# ── Portfolio ──

@api_router.post("/portfolio")
async def add_portfolio(req: PortfolioCreate, user=Depends(get_current_user)):
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    item = {
        "id": str(uuid.uuid4()), 
        "contractor_id": user["id"],
        "title": req.title, 
        "description": req.description or "",
        "image_base64": req.image_base64,
        "images": req.images or [],  # Array of images
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio.insert_one(item.copy())
    return item

@api_router.delete("/portfolio/{item_id}")
async def delete_portfolio(item_id: str, user=Depends(get_current_user)):
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    result = await db.portfolio.delete_one({"id": item_id, "contractor_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Portfolio item not found")
    return {"message": "Deleted"}

@api_router.get("/portfolio/{cid}")
async def get_portfolio(cid: str):
    return {"portfolio": await db.portfolio.find({"contractor_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)}

# ── Conversations ──

@api_router.post("/conversations")
async def create_conversation(req: ConversationCreate, user=Depends(get_current_user)):
    existing = await db.conversations.find_one({
        "$or": [
            {"participant_1": user["id"], "participant_2": req.participant_id},
            {"participant_1": req.participant_id, "participant_2": user["id"]}
        ]
    }, {"_id": 0})
    if existing:
        return existing
    
    other = await db.users.find_one({"id": req.participant_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "User not found")
    
    # Get job details if job_id is provided
    job_title = ""
    if req.job_id:
        job = await db.posted_jobs.find_one({"id": req.job_id}, {"title": 1})
        if job:
            job_title = job.get("title", "")
    
    conv = {
        "id": str(uuid.uuid4()),
        "participant_1": user["id"], 
        "participant_2": req.participant_id,
        "participants": [user["id"], req.participant_id],
        "participant_1_name": user["name"], 
        "participant_2_name": other["name"],
        "participant_1_role": user["role"], 
        "participant_2_role": other["role"],
        "participant_1_phone": user.get("phone", ""),
        "participant_2_phone": other.get("phone", ""),
        "participant_1_email": user.get("email", ""),
        "participant_2_email": other.get("email", ""),
        "job_id": req.job_id or "",
        "job_title": job_title,
        "job_status": "pending",  # Always start as pending
        "confirmed_by": [],
        "last_message": "", 
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(conv.copy())
    return conv

@api_router.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    convs = await db.conversations.find(
        {"$or": [{"participant_1": user["id"]}, {"participant_2": user["id"]}]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)
    
    # Enrich with phone/email if missing (for backwards compatibility)
    for conv in convs:
        # Ensure job_status exists - default to 'pending' for old conversations
        if not conv.get("job_status"):
            conv["job_status"] = "pending"
            # Also update DB for future queries
            await db.conversations.update_one(
                {"id": conv["id"]},
                {"$set": {"job_status": "pending"}}
            )
        
        # Ensure confirmed_by exists
        if "confirmed_by" not in conv:
            conv["confirmed_by"] = []
        
        # Check if phone/email are missing and fetch from users
        if not conv.get("participant_1_phone") or not conv.get("participant_2_phone"):
            p1 = await db.users.find_one({"id": conv["participant_1"]}, {"phone": 1, "email": 1})
            p2 = await db.users.find_one({"id": conv["participant_2"]}, {"phone": 1, "email": 1})
            if p1:
                conv["participant_1_phone"] = p1.get("phone", "")
                conv["participant_1_email"] = p1.get("email", "")
            if p2:
                conv["participant_2_phone"] = p2.get("phone", "")
                conv["participant_2_email"] = p2.get("email", "")
        
        # Try to find linked job for this conversation
        if not conv.get("job_id"):
            # Find a job where:
            # - One participant is the job poster
            # - The other participant responded to the job
            other_id = conv["participant_2"] if conv["participant_1"] == user["id"] else conv["participant_1"]
            
            # Check if current user posted a job that the other responded to
            linked_job = await db.posted_jobs.find_one({
                "posted_by": user["id"],
                "responses.contractor_id": other_id
            })
            
            if not linked_job:
                # Check if other user posted a job that current user responded to
                linked_job = await db.posted_jobs.find_one({
                    "posted_by": other_id,
                    "responses.contractor_id": user["id"]
                })
            
            if linked_job:
                conv["job_id"] = linked_job["id"]
                conv["job_title"] = linked_job.get("title", "")
                # Update the conversation with job_id for future queries
                await db.conversations.update_one(
                    {"id": conv["id"]},
                    {"$set": {"job_id": linked_job["id"], "job_title": linked_job.get("title", "")}}
                )
    
    return {"conversations": convs}

@api_router.get("/messages/{conv_id}")
async def get_messages(conv_id: str):
    return {"messages": await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(200)}

# Send message via API (more reliable than socket)
class SendMessageReq(BaseModel):
    conversation_id: str
    text: str = ""
    image: Optional[str] = None  # base64 image data

@api_router.post("/messages/send")
async def send_message_api(req: SendMessageReq, user=Depends(get_current_user)):
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": req.conversation_id,
        "sender_id": user["id"],
        "text": req.text,
        "image": req.image,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg.copy())
    # Update conversation last_message
    last_msg_text = req.text if req.text else "📷 Image"
    await db.conversations.update_one(
        {"id": req.conversation_id},
        {"$set": {"last_message": last_msg_text, "last_message_at": msg["created_at"]}}
    )
    # Emit via socket if available
    try:
        await sio.emit('new_message', msg, room=req.conversation_id)
    except:
        pass
    return {"message": msg}

# Confirm job in conversation
@api_router.post("/conversations/{conv_id}/confirm-job")
async def confirm_job(conv_id: str, user=Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    
    # Initialize confirmed_by if not exists
    confirmed_by = conv.get("confirmed_by", [])
    
    # Add user to confirmed list if not already
    if user["id"] not in confirmed_by:
        confirmed_by.append(user["id"])
    
    # Check if both parties confirmed
    participants = [conv["participant_1"], conv["participant_2"]]
    all_confirmed = all(p in confirmed_by for p in participants)
    
    job_status = "confirmed" if all_confirmed else "pending_confirmation"
    
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": {
            "confirmed_by": confirmed_by,
            "job_status": job_status,
            "confirmed_at": datetime.now(timezone.utc).isoformat() if all_confirmed else None
        }}
    )
    
    updated_conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    
    # Notify both parties via socket
    try:
        await sio.emit('job_confirmed', {
            "conversation_id": conv_id,
            "confirmed_by": confirmed_by,
            "job_status": job_status
        }, room=conv_id)
    except:
        pass
    
    return {"conversation": updated_conv}

@api_router.post("/conversations/{conv_id}/archive-job")
async def archive_job(conv_id: str, user=Depends(get_current_user)):
    """Mark a job as completed and archive the conversation"""
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    
    # Verify user is a participant
    if user["id"] not in [conv["participant_1"], conv["participant_2"]]:
        raise HTTPException(403, "Not authorized")
    
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": {
            "job_status": "archived",
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "archived_by": user["id"]
        }}
    )
    
    updated_conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    
    # Notify both parties via socket
    try:
        await sio.emit('job_archived', {
            "conversation_id": conv_id,
            "archived_by": user["id"]
        }, room=conv_id)
    except:
        pass
    
    return {"conversation": updated_conv}

@api_router.post("/conversations/{conv_id}/reset-to-pending")
async def reset_to_pending(conv_id: str, user=Depends(get_current_user)):
    """Reset job status back to pending (from confirmed)"""
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    
    if user["id"] not in [conv["participant_1"], conv["participant_2"]]:
        raise HTTPException(403, "Not authorized")
    
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": {
            "job_status": None,
            "confirmed_by": [],
            "confirmed_at": None
        }}
    )
    
    updated_conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    return {"conversation": updated_conv}

@api_router.post("/conversations/{conv_id}/reset-to-confirmed")
async def reset_to_confirmed(conv_id: str, user=Depends(get_current_user)):
    """Reset job status back to confirmed/in-progress (from archived)"""
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    
    if user["id"] not in [conv["participant_1"], conv["participant_2"]]:
        raise HTTPException(403, "Not authorized")
    
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": {
            "job_status": "confirmed",
            "archived_at": None,
            "archived_by": None
        }}
    )
    
    updated_conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    return {"conversation": updated_conv}

@api_router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user=Depends(get_current_user)):
    """Delete a conversation (only for pending conversations)"""
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation not found")
    
    if user["id"] not in [conv["participant_1"], conv["participant_2"]]:
        raise HTTPException(403, "Not authorized")
    
    # Only allow deletion of pending conversations
    if conv.get("job_status") in ["confirmed", "archived"]:
        raise HTTPException(400, "Cannot delete confirmed or completed conversations")
    
    # Delete the conversation
    await db.conversations.delete_one({"id": conv_id})
    
    # Also delete associated messages
    await db.messages.delete_many({"conversation_id": conv_id})
    
    return {"message": "Conversation removed"}

# ── Contracts ──

@api_router.post("/contracts/generate")
async def generate_contract(req: ContractReq, user=Depends(get_current_user)):
    # AI Contract Generation is temporarily disabled
    # Generate a basic template contract instead
    response = f"""
SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into between:

CONTRACTOR: {req.contractor_name}
CLIENT: {req.client_name}

1. SCOPE OF WORK
{req.job_description}

2. LOCATION
{req.job_location}

3. TIMELINE
Start Date: {req.start_date}
Estimated Duration: {req.estimated_duration}

4. PAYMENT TERMS
Total Amount: ${req.total_amount}
Payment Schedule: {req.payment_terms}

5. TERMS AND CONDITIONS
- Contractor agrees to perform work in a professional manner
- Client agrees to provide access to the work site
- Any changes to scope must be agreed upon in writing
- This agreement is binding upon signing by both parties

Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

_______________________          _______________________
{req.contractor_name}            {req.client_name}
(Contractor Signature)           (Client Signature)
"""

    contract = {
        "id": str(uuid.uuid4()), 
        "creator_id": user["id"],
        "contractor_name": req.contractor_name, 
        "client_name": req.client_name,
        "job_description": req.job_description, 
        "job_location": req.job_location,
        "start_date": req.start_date, 
        "estimated_duration": req.estimated_duration,
        "total_amount": req.total_amount, 
        "payment_terms": req.payment_terms,
        "contract_text": response, 
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contracts.insert_one(contract.copy())
    return contract

@api_router.get("/contracts")
async def list_contracts(user=Depends(get_current_user)):
    return {"contracts": await db.contracts.find({"creator_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)}

# ── Payments ──

@api_router.post("/payments/create-subscription")
async def create_subscription(req: SubscriptionReq, request: Request, user=Depends(get_current_user)):
    if user["role"] != "contractor":
        raise HTTPException(403, "Only contractors need subscriptions")
    
    success_url = f"{req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/payment"
    
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            metadata={"user_id": user["id"], "user_email": user["email"], "type": "contractor_subscription"},
            customer_email=user["email"],
        )
        
        tx = {
            "id": str(uuid.uuid4()), 
            "session_id": session.id,
            "user_id": user["id"], 
            "user_email": user["email"],
            "payment_status": "pending", 
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(tx.copy())
        return {"url": session.url, "session_id": session.id}
    except stripe.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(500, f"Payment setup failed: {str(e)}")

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, user=Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        status = session.status
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status, "status": status}}
        )
        
        if payment_status == "paid" or status == "complete":
            tx = await db.payment_transactions.find_one({"session_id": session_id})
            if tx and tx.get("status") != "completed":
                await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"status": "completed"}})
                await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_status": "active"}})
        
        return {"status": status, "payment_status": payment_status}
    except stripe.StripeError as e:
        raise HTTPException(500, f"Failed to check payment: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    try:
        event = stripe.Event.construct_from(
            stripe.util.convert_to_stripe_object(await request.json()),
            stripe.api_key
        )
        if event.type == "checkout.session.completed":
            session = event.data.object
            user_id = session.metadata.get("user_id")
            if user_id:
                await db.users.update_one({"id": user_id}, {"$set": {"subscription_status": "active"}})
                logger.info(f"Activated subscription for {user_id}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ── Admin ──

@api_router.post("/admin/verify")
async def verify_admin(req: AdminActionReq):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    return {"verified": True}

@api_router.get("/admin/contractors")
async def admin_list_contractors(admin_secret: str = ""):
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Admin access required")
    return {"contractors": await db.users.find({"role": "contractor"}, {"_id": 0, "password_hash": 0}).to_list(200)}

@api_router.post("/admin/activate/{uid}")
async def admin_activate(uid: str, req: AdminActionReq):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": uid}, {"$set": {"subscription_status": "active", "subscription_fee": 0}})
    return {"message": f"Activated {target['name']} for free"}

@api_router.post("/admin/deactivate/{uid}")
async def admin_deactivate(uid: str, req: AdminActionReq):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    await db.users.update_one({"id": uid}, {"$set": {"subscription_status": "pending"}})
    return {"message": "Deactivated"}

@api_router.get("/admin/stats")
async def admin_stats(admin_secret: str = ""):
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Admin access required")
    
    total_users = await db.users.count_documents({})
    total_contractors = await db.users.count_documents({"role": "contractor"})
    active_contractors = await db.users.count_documents({"role": "contractor", "subscription_status": "active"})
    online_contractors = await db.users.count_documents({"role": "contractor", "is_online": True})
    total_clients = await db.users.count_documents({"role": "client"})
    total_jobs = await db.jobs.count_documents({})
    open_jobs = await db.jobs.count_documents({"status": "open"})
    
    return {
        "total_users": total_users,
        "total_contractors": total_contractors,
        "active_contractors": active_contractors,
        "online_contractors": online_contractors,
        "total_clients": total_clients,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs
    }

# ── Push Notifications ──

class PushTokenReq(BaseModel):
    push_token: str

async def send_push_notification(to_token: str, title: str, body: str, data: dict = None):
    if not to_token:
        return False
    try:
        message = {
            "to": to_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {}
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"}
            )
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Push error: {e}")
        return False

@api_router.post("/push-token")
async def save_push_token(req: PushTokenReq, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"push_token": req.push_token}})
    return {"message": "Push token saved"}

@api_router.delete("/push-token")
async def delete_push_token(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$unset": {"push_token": ""}})
    return {"message": "Push token removed"}

# ── Home Stats ──

@api_router.get("/home/stats")
async def get_home_stats(lat: Optional[float] = None, lng: Optional[float] = None):
    """Get stats for client home screen"""
    online_count = await db.users.count_documents({
        "role": "contractor", 
        "subscription_status": "active", 
        "is_online": True
    })
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    jobs_today = await db.jobs.count_documents({"created_at": {"$gte": today}})
    
    # Get popular categories
    pipeline = [
        {"$match": {"role": "contractor", "subscription_status": "active"}},
        {"$group": {"_id": "$contractor_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular = await db.users.aggregate(pipeline).to_list(5)
    
    return {
        "contractors_available": online_count,
        "jobs_posted_today": jobs_today,
        "popular_categories": [{"name": p["_id"], "count": p["count"], "icon": CATEGORY_ICONS.get(p["_id"], "🔧")} for p in popular if p["_id"]]
    }

# ── Download endpoints ──

@api_router.get("/download/feature-graphic")
async def download_feature_graphic():
    file_path = ROOT_DIR / "feature-graphic.png"
    if file_path.exists():
        return FileResponse(file_path, media_type="image/png", filename="feature-graphic.png")
    raise HTTPException(404, "File not found")

@api_router.get("/download/icon-512")
async def download_icon():
    file_path = ROOT_DIR / "icon-512.png"
    if file_path.exists():
        return FileResponse(file_path, media_type="image/png", filename="icon-512.png")
    raise HTTPException(404, "File not found")

# ── Seed Data ──

async def seed_data():
    if await db.users.count_documents({"role": "contractor"}) > 0:
        return
    logger.info("Seeding demo data...")
    base_lat, base_lng = 40.7128, -74.0060
    
    # (name, type, trades, bio, rating, reviews, exp, languages)
    demos = [
        ("Mike Johnson", "Electrician", ["Electrician"], "Licensed electrician with 15+ years experience.", 4.8, 47, 12, ["English"]),
        ("Carlos Rodriguez", "Plumber", ["Plumber"], "Master plumber. Emergency repairs, bathroom remodels, water heaters.", 4.9, 62, 8, ["English", "Spanish"]),
        ("Dave Williams", "Handyman", ["Handyman", "Painter"], "Jack of all trades. No job too small.", 4.5, 33, 5, ["English"]),
        ("James Chen", "Carpenter", ["Carpenter", "Cabinet Maker"], "Custom cabinetry and woodwork.", 4.7, 28, 10, ["English", "Mandarin"]),
        ("Robert Taylor", "Painter", ["Painter"], "Interior & exterior painting specialist.", 4.6, 41, 6, ["English"]),
        ("Ahmed Hassan", "Roofer", ["Roofer"], "Full roof replacements and repairs.", 4.8, 35, 15, ["English", "Arabic"]),
        ("Tom O'Brien", "HVAC Technician", ["HVAC Technician"], "AC repair, furnace installation, duct work.", 4.7, 29, 9, ["English", "French"]),
        ("Luis Martinez", "Tiler", ["Tiler", "Flooring Specialist"], "Beautiful tile and flooring work.", 4.9, 44, 7, ["English", "Spanish", "Portuguese"]),
        ("Kevin Brown", "General Contractor", ["General Contractor"], "Full home renovations and additions.", 4.6, 51, 20, ["English"]),
        ("Steve Wilson", "Welder", ["Welder"], "Structural & decorative welding. Custom fabrication.", 4.5, 19, 11, ["English"]),
    ]
    
    comments = [
        "Excellent work! Very professional.",
        "Great job! Would hire again.",
        "Very knowledgeable and fair pricing.",
        "Fantastic! Highly recommend!",
        "Professional and efficient.",
    ]
    names = ["Sarah Smith", "Emily Jones", "John Williams", "Lisa Brown", "Michael Davis"]

    for name, ctype, trades, bio, rating, rc, exp, languages in demos:
        lat_off, lng_off = random.uniform(-0.05, 0.05), random.uniform(-0.05, 0.05)
        uid = str(uuid.uuid4())
        user = {
            "id": uid, 
            "name": name, 
            "email": f"{name.lower().replace(' ', '.')}@demo.com",
            "phone": f"+1555{random.randint(1000000, 9999999)}", 
            "password_hash": hash_pw("demo123"),
            "role": "contractor", 
            "contractor_type": ctype,
            "trades": trades,
            "bio": bio, 
            "experience_years": exp,
            "languages": languages,
            "service_radius": random.choice([10, 15, 20, 25]),
            "availability_hours": {"start": "08:00", "end": "18:00"},
            "profile_photo": None,
            "is_online": random.choice([True, True, False]),
            "last_online": datetime.now(timezone.utc).isoformat(),
            "live_location_enabled": True,
            "current_location": {"lat": base_lat + lat_off, "lng": base_lng + lng_off},
            "work_locations": [{"name": "Main", "lat": base_lat + lat_off, "lng": base_lng + lng_off}],
            "rating": rating, 
            "review_count": rc,
            "response_rate": random.randint(85, 100),
            "avg_response_time": random.randint(2, 15),
            "jobs_received": random.randint(50, 200),
            "jobs_completed": random.randint(40, 150),
            "profile_views": random.randint(100, 500),
            "subscription_status": "active", 
            "subscription_fee": 25.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user.copy())
        
        for _ in range(min(5, rc)):
            r = {
                "id": str(uuid.uuid4()), 
                "contractor_id": uid,
                "client_id": str(uuid.uuid4()), 
                "client_name": random.choice(names),
                "rating": random.choice([4, 5, 5, 5, 5]),
                "comment": random.choice(comments),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.reviews.insert_one(r.copy())

    # Demo client
    await db.users.insert_one({
        "id": str(uuid.uuid4()), 
        "name": "Demo Client", 
        "email": "client@demo.com",
        "phone": "+15551234567", 
        "password_hash": hash_pw("demo123"),
        "role": "client", 
        "contractor_type": None,
        "trades": [],
        "bio": "", 
        "experience_years": 0,
        "service_radius": 0,
        "profile_photo": None,
        "is_online": False,
        "live_location_enabled": False, 
        "current_location": None, 
        "work_locations": [],
        "rating": 0, 
        "review_count": 0, 
        "subscription_status": "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    logger.info("Seeded contractors + demo client")

@fastapi_app.on_event("startup")
async def startup():
    await seed_data()

@fastapi_app.on_event("shutdown")
async def shutdown():
    mongo_client.close()

fastapi_app.include_router(api_router)
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
