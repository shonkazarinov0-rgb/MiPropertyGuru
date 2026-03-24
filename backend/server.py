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

class LoginReq(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

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

class PortfolioCreate(BaseModel):
    title: str
    description: str
    image_base64: Optional[str] = None

class ConversationCreate(BaseModel):
    participant_id: str

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
    # Check if user exists by email or phone
    existing = await db.users.find_one({"$or": [{"email": req.email}, {"phone": req.phone}]})
    if existing:
        raise HTTPException(400, "Email or phone already registered")
    
    if req.role == "contractor" and not req.contractor_type and not req.trades:
        raise HTTPException(400, "Contractor type or trades required")
    
    uid = str(uuid.uuid4())
    user = {
        "id": uid, 
        "name": req.name, 
        "email": req.email,
        "phone": req.phone,
        "password_hash": hash_pw(req.password), 
        "role": req.role,
        "contractor_type": req.contractor_type if req.role == "contractor" else None,
        "trades": req.trades or ([req.contractor_type] if req.contractor_type else []),
        "bio": req.bio or "", 
        "experience_years": req.experience_years or 0,
        "service_radius": req.service_radius or 15,
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
        "avg_response_time": 5,  # minutes
        "jobs_received": 0,
        "jobs_completed": 0,
        "profile_views": 0,
        "subscription_status": "active",  # Free for testing - remove payment requirement
        "subscription_fee": 0,  # Free for now
        "terms_accepted": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user.copy())
    token = create_token(uid, req.email or req.phone, req.role)
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": safe}

@api_router.post("/auth/login")
async def login(req: LoginReq):
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
    token = create_token(user["id"], user.get("email") or user["phone"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": safe}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

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
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Get contractor details for responses
    responses_with_details = []
    for resp in job.get("contractor_responses", []):
        if resp["action"] == "accept":
            contractor = await db.users.find_one(
                {"id": resp["contractor_id"]}, 
                {"_id": 0, "password_hash": 0}
            )
            resp["contractor"] = contractor
            responses_with_details.append(resp)
    
    job["contractor_responses"] = responses_with_details
    return {"job": job}

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
    
    return review

@api_router.get("/reviews/{cid}")
async def get_reviews(cid: str):
    return {"reviews": await db.reviews.find({"contractor_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)}

# ── Portfolio ──

@api_router.post("/portfolio")
async def add_portfolio(req: PortfolioCreate, user=Depends(get_current_user)):
    if user["role"] != "contractor":
        raise HTTPException(403, "Contractors only")
    item = {
        "id": str(uuid.uuid4()), 
        "contractor_id": user["id"],
        "title": req.title, 
        "description": req.description,
        "image_base64": req.image_base64,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio.insert_one(item.copy())
    return item

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
    
    conv = {
        "id": str(uuid.uuid4()),
        "participant_1": user["id"], 
        "participant_2": req.participant_id,
        "participants": [user["id"], req.participant_id],
        "participant_1_name": user["name"], 
        "participant_2_name": other["name"],
        "participant_1_role": user["role"], 
        "participant_2_role": other["role"],
        "last_message": "", 
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(conv.copy())
    return conv

@api_router.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    return {"conversations": await db.conversations.find(
        {"$or": [{"participant_1": user["id"]}, {"participant_2": user["id"]}]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)}

@api_router.get("/messages/{conv_id}")
async def get_messages(conv_id: str):
    return {"messages": await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(200)}

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
    
    demos = [
        ("Mike Johnson", "Electrician", ["Electrician"], "Licensed electrician with 15+ years experience.", 4.8, 47, 12),
        ("Carlos Rodriguez", "Plumber", ["Plumber"], "Master plumber. Emergency repairs, remodels.", 4.9, 62, 8),
        ("Dave Williams", "Handyman", ["Handyman", "Painter"], "Jack of all trades.", 4.5, 33, 5),
        ("James Chen", "Carpenter", ["Carpenter", "Cabinet Maker"], "Custom cabinetry and woodwork.", 4.7, 28, 10),
        ("Robert Taylor", "Painter", ["Painter"], "Interior & exterior painting.", 4.6, 41, 6),
        ("Ahmed Hassan", "Roofer", ["Roofer"], "Full replacements and repairs.", 4.8, 35, 15),
        ("Tom O'Brien", "HVAC Technician", ["HVAC Technician"], "AC repair, furnace installation.", 4.7, 29, 9),
        ("Luis Martinez", "Tiler", ["Tiler", "Flooring Specialist"], "Beautiful tile work.", 4.9, 44, 7),
        ("Kevin Brown", "General Contractor", ["General Contractor"], "Full home renovations.", 4.6, 51, 20),
        ("Steve Wilson", "Welder", ["Welder"], "Structural & decorative welding.", 4.5, 19, 11),
    ]
    
    comments = [
        "Excellent work! Very professional.",
        "Great job! Would hire again.",
        "Very knowledgeable and fair pricing.",
        "Fantastic! Highly recommend!",
        "Professional and efficient.",
    ]
    names = ["Sarah Smith", "Emily Jones", "John Williams", "Lisa Brown", "Michael Davis"]

    for name, ctype, trades, bio, rating, rc, exp in demos:
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
