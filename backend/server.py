import socketio
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
import jwt as pyjwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import Request
import math
import random
import stripe
import httpx

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

# Initialize Stripe
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

# ── Pydantic Models ──

class RegisterReq(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str
    contractor_type: Optional[str] = None
    bio: Optional[str] = ""
    hourly_rate: Optional[float] = 0

class LoginReq(BaseModel):
    email: str
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
    hourly_rate: Optional[float] = None
    contractor_type: Optional[str] = None

class SubscriptionReq(BaseModel):
    origin_url: str

class AdminActionReq(BaseModel):
    admin_secret: str

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

def haversine(lat1, lon1, lat2, lon2):
    R = 3959
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
    connected_users.pop(sid, None)
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
    
    # Send push notification to the other participant
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
        logger.error(f"Push notification error in send_message: {e}")

@sio.event
async def typing(sid, data):
    conv_id = data.get("conversation_id")
    uid = connected_users.get(sid)
    if conv_id and uid:
        await sio.emit("user_typing", {"user_id": uid}, room=conv_id, skip_sid=sid)

# ── FastAPI ──

fastapi_app = FastAPI(title="MiPropertyGuru API")
fastapi_app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
api_router = APIRouter(prefix="/api")

# ── Auth Routes ──

@api_router.post("/auth/register")
async def register(req: RegisterReq):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    if req.role == "contractor" and not req.contractor_type:
        raise HTTPException(400, "Contractor type required")
    uid = str(uuid.uuid4())
    user = {
        "id": uid, "name": req.name, "email": req.email, "phone": req.phone,
        "password_hash": hash_pw(req.password), "role": req.role,
        "contractor_type": req.contractor_type if req.role == "contractor" else None,
        "bio": req.bio or "", "hourly_rate": req.hourly_rate or 0,
        "live_location_enabled": False, "current_location": None, "work_locations": [],
        "rating": 0, "review_count": 0,
        "subscription_status": "pending" if req.role == "contractor" else "free",
        "subscription_fee": 25.0 if req.role == "contractor" else 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user.copy())
    token = create_token(uid, req.email, req.role)
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": safe}

@api_router.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_pw(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["email"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": safe}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ── Contractor Routes ──

@api_router.get("/contractor-types")
async def get_types():
    return {"types": CONTRACTOR_TYPES}

@api_router.get("/contractors")
async def list_contractors(category: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None):
    q = {"role": "contractor", "subscription_status": "active"}
    if category and category != "All":
        q["contractor_type"] = category
    contractors = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(100)
    if lat is not None and lng is not None:
        for c in contractors:
            clat, clng = None, None
            if c.get("live_location_enabled") and c.get("current_location"):
                clat = c["current_location"].get("lat")
                clng = c["current_location"].get("lng")
            elif c.get("work_locations") and len(c["work_locations"]) > 0:
                clat = c["work_locations"][0].get("lat")
                clng = c["work_locations"][0].get("lng")
            c["distance"] = haversine(lat, lng, clat, clng) if (clat and clng) else 999
        contractors.sort(key=lambda x: x.get("distance", 999))
    return {"contractors": contractors}

@api_router.get("/contractors/{cid}")
async def get_contractor(cid: str):
    c = await db.users.find_one({"id": cid, "role": "contractor"}, {"_id": 0, "password_hash": 0})
    if not c:
        raise HTTPException(404, "Not found")
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

# ── Reviews ──

@api_router.post("/reviews")
async def create_review(req: ReviewCreate, user=Depends(get_current_user)):
    review = {
        "id": str(uuid.uuid4()), "contractor_id": req.contractor_id,
        "client_id": user["id"], "client_name": user["name"],
        "rating": max(1, min(5, req.rating)), "comment": req.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review.copy())
    all_r = await db.reviews.find({"contractor_id": req.contractor_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["rating"] for r in all_r) / len(all_r) if all_r else 0
    await db.users.update_one({"id": req.contractor_id}, {"$set": {"rating": round(avg, 1), "review_count": len(all_r)}})
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
        "id": str(uuid.uuid4()), "contractor_id": user["id"],
        "title": req.title, "description": req.description,
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
        "participant_1": user["id"], "participant_2": req.participant_id,
        "participant_1_name": user["name"], "participant_2_name": other["name"],
        "participant_1_role": user["role"], "participant_2_role": other["role"],
        "last_message": "", "last_message_at": datetime.now(timezone.utc).isoformat(),
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
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are a professional contract lawyer. Generate a clear, legally formatted contractor-client service agreement with numbered sections covering: scope of work, payment terms, timeline, liability, dispute resolution, and termination."
        )
        chat.with_model("openai", "gpt-5.2")
        prompt = f"""Generate a professional service contract with these details:
Contractor: {req.contractor_name}
Client: {req.client_name}
Job Description: {req.job_description}
Location: {req.job_location}
Start Date: {req.start_date}
Estimated Duration: {req.estimated_duration}
Total Amount: ${req.total_amount}
Payment Terms: {req.payment_terms}"""
        response = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"AI contract generation failed: {e}")
        raise HTTPException(500, f"Contract generation failed: {str(e)}")

    contract = {
        "id": str(uuid.uuid4()), "creator_id": user["id"],
        "contractor_name": req.contractor_name, "client_name": req.client_name,
        "job_description": req.job_description, "job_location": req.job_location,
        "start_date": req.start_date, "estimated_duration": req.estimated_duration,
        "total_amount": req.total_amount, "payment_terms": req.payment_terms,
        "contract_text": response, "status": "draft",
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
        # Create Stripe Checkout Session using your Price ID with all your configured settings
        session = stripe.checkout.Session.create(
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,  # Your $24.99 CAD recurring price with phone collection
                    "quantity": 1,
                }
            ],
            metadata={
                "user_id": user["id"],
                "user_email": user["email"],
                "type": "contractor_subscription"
            },
            customer_email=user["email"],  # Pre-fill their email
        )
        
        tx = {
            "id": str(uuid.uuid4()), 
            "session_id": session.id,
            "user_id": user["id"], 
            "user_email": user["email"],
            "payment_status": "pending", 
            "status": "initiated",
            "metadata": {"type": "contractor_subscription"},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(tx.copy())
        return {"url": session.url, "session_id": session.id}
    except stripe.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(500, f"Payment setup failed: {str(e)}")

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, request: Request, user=Depends(get_current_user)):
    try:
        # Use native Stripe SDK to check session status
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status  # 'paid', 'unpaid', 'no_payment_required'
        status = session.status  # 'open', 'complete', 'expired'
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status, "status": status}}
        )
        
        if payment_status == "paid" or status == "complete":
            tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if tx and tx.get("status") != "completed":
                await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"status": "completed"}})
                await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_status": "active"}})
        
        return {
            "status": status, 
            "payment_status": payment_status, 
            "amount_total": session.amount_total,
            "currency": session.currency
        }
    except stripe.StripeError as e:
        logger.error(f"Stripe status check error: {e}")
        raise HTTPException(500, f"Failed to check payment status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    
    try:
        # Parse the webhook event
        event = stripe.Event.construct_from(
            stripe.util.convert_to_stripe_object(await request.json()),
            stripe.api_key
        )
        
        # Handle checkout.session.completed event
        if event.type == "checkout.session.completed":
            session = event.data.object
            user_id = session.metadata.get("user_id")
            if user_id:
                await db.users.update_one({"id": user_id}, {"$set": {"subscription_status": "active"}})
                await db.payment_transactions.update_one(
                    {"session_id": session.id},
                    {"$set": {"payment_status": "paid", "status": "completed"}}
                )
                logger.info(f"Activated subscription for user {user_id}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ── Admin ──

@api_router.post("/admin/verify")
async def verify_admin(req: AdminActionReq, user=Depends(get_current_user)):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    return {"verified": True}

@api_router.get("/admin/contractors")
async def admin_list_contractors(admin_secret: str = "", user=Depends(get_current_user)):
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Admin access required")
    return {"contractors": await db.users.find({"role": "contractor"}, {"_id": 0, "password_hash": 0}).to_list(200)}

@api_router.post("/admin/activate/{uid}")
async def admin_activate(uid: str, req: AdminActionReq, user=Depends(get_current_user)):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": uid}, {"$set": {"subscription_status": "active", "subscription_fee": 0}})
    return {"message": f"Activated {target['name']} for free"}

@api_router.post("/admin/deactivate/{uid}")
async def admin_deactivate(uid: str, req: AdminActionReq, user=Depends(get_current_user)):
    if req.admin_secret != ADMIN_SECRET:
        raise HTTPException(403, "Invalid admin code")
    await db.users.update_one({"id": uid}, {"$set": {"subscription_status": "pending"}})
    return {"message": "Deactivated"}

# ── Push Notifications ──

class PushTokenReq(BaseModel):
    push_token: str

async def send_push_notification(to_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push Notification Service"""
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
            logger.info(f"Push notification sent: {resp.status_code}")
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False

@api_router.post("/push-token")
async def save_push_token(req: PushTokenReq, user=Depends(get_current_user)):
    """Save user's push notification token"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"push_token": req.push_token}}
    )
    return {"message": "Push token saved"}

@api_router.delete("/push-token")
async def delete_push_token(user=Depends(get_current_user)):
    """Remove user's push notification token (logout)"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"push_token": ""}}
    )
    return {"message": "Push token removed"}

# ── Seed Data ──

async def seed_data():
    if await db.users.count_documents({"role": "contractor"}) > 0:
        return
    logger.info("Seeding demo data...")
    base_lat, base_lng = 40.7128, -74.0060
    demos = [
        ("Mike Johnson", "Electrician", 85, "Licensed electrician with 15+ years. Residential & commercial wiring, panels, lighting.", 4.8, 47),
        ("Carlos Rodriguez", "Plumber", 90, "Master plumber. Emergency repairs, bathroom remodels, water heaters.", 4.9, 62),
        ("Dave Williams", "Handyman", 55, "Jack of all trades. Furniture assembly to minor repairs.", 4.5, 33),
        ("James Chen", "Carpenter", 75, "Custom cabinetry, deck building, and trim work.", 4.7, 28),
        ("Robert Taylor", "Painter", 60, "Interior & exterior painting with premium paints.", 4.6, 41),
        ("Ahmed Hassan", "Roofer", 95, "Full replacements, repairs & inspections. Licensed & insured.", 4.8, 35),
        ("Tom O'Brien", "HVAC Technician", 100, "AC repair, furnace installation, duct cleaning.", 4.7, 29),
        ("Luis Martinez", "Tiler", 70, "Beautiful tile for kitchens, bathrooms & floors.", 4.9, 44),
        ("Kevin Brown", "General Contractor", 110, "Full home renovations and project management.", 4.6, 51),
        ("Steve Wilson", "Welder", 80, "Structural & decorative welding. Custom fabrication.", 4.5, 19),
        ("Frank DeLuca", "Mason", 85, "Brick, stone & concrete. Patios, walls, foundations.", 4.7, 37),
        ("Patrick Murphy", "Landscaper", 65, "Complete landscape design & maintenance.", 4.8, 52),
        ("Brian Cooper", "Flooring Specialist", 70, "Hardwood, laminate, vinyl & tile expert.", 4.6, 31),
        ("Nick Petrov", "Drywall Installer", 55, "Hanging, taping, finishing & texture matching.", 4.4, 22),
        ("Sam Richardson", "Fence Installer", 60, "Wood, vinyl, chain link & aluminum fencing.", 4.7, 26),
        ("Derek Foster", "Deck Builder", 80, "Custom decks with composite & pressure-treated lumber.", 4.8, 38),
        ("Tony Gambino", "Concrete Specialist", 75, "Driveways, sidewalks, foundations, stamped concrete.", 4.5, 43),
        ("Ray Kim", "Solar Panel Installer", 120, "Certified solar installer. Residential systems.", 4.9, 15),
        ("Chris Henderson", "Window Installer", 70, "Energy-efficient replacement & new installations.", 4.6, 24),
        ("Mark Davis", "Cabinet Maker", 90, "Custom kitchen & bathroom cabinets.", 4.8, 33),
    ]
    comments = [
        "Excellent work! Very professional and on time.",
        "Great job! Would definitely hire again.",
        "Very knowledgeable and fair pricing.",
        "Fantastic job. Highly recommend!",
        "Professional, clean, and efficient. A+ work.",
    ]
    names = ["Sarah Smith", "Emily Jones", "John Williams", "Lisa Brown", "Michael Davis", "Jennifer Miller"]
    titles = ["Kitchen Reno", "Bathroom Remodel", "Deck Build", "Panel Upgrade", "Roof Repair", "Fence Install", "Floor Refinish", "Custom Shelving"]

    for name, ctype, rate, bio, rating, rc in demos:
        lat_off, lng_off = random.uniform(-0.05, 0.05), random.uniform(-0.05, 0.05)
        uid = str(uuid.uuid4())
        user = {
            "id": uid, "name": name, "email": f"{name.lower().replace(' ', '.')}@demo.com",
            "phone": f"+1555{random.randint(1000000, 9999999)}", "password_hash": hash_pw("demo123"),
            "role": "contractor", "contractor_type": ctype, "bio": bio, "hourly_rate": rate,
            "live_location_enabled": random.choice([True, False]),
            "current_location": {"lat": base_lat + lat_off, "lng": base_lng + lng_off},
            "work_locations": [
                {"name": "Main Area", "lat": base_lat + lat_off, "lng": base_lng + lng_off},
                {"name": "Secondary", "lat": base_lat + lat_off + 0.02, "lng": base_lng + lng_off + 0.02}
            ],
            "rating": rating, "review_count": rc,
            "subscription_status": "active", "subscription_fee": 25.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user.copy())
        for _ in range(min(5, rc)):
            r = {
                "id": str(uuid.uuid4()), "contractor_id": uid,
                "client_id": str(uuid.uuid4()), "client_name": random.choice(names),
                "rating": random.choice([4, 4, 5, 5, 5]),
                "comment": random.choice(comments),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.reviews.insert_one(r.copy())
        for _ in range(2):
            p = {
                "id": str(uuid.uuid4()), "contractor_id": uid,
                "title": random.choice(titles),
                "description": "Quality residential project completed on time and within budget.",
                "image_base64": None, "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.portfolio.insert_one(p.copy())

    await db.users.insert_one({
        "id": str(uuid.uuid4()), "name": "Demo Client", "email": "client@demo.com",
        "phone": "+15551234567", "password_hash": hash_pw("demo123"),
        "role": "client", "contractor_type": None, "bio": "", "hourly_rate": 0,
        "live_location_enabled": False, "current_location": None, "work_locations": [],
        "rating": 0, "review_count": 0, "subscription_status": "free", "subscription_fee": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    logger.info("Seeded 20 contractors + 1 demo client")

@fastapi_app.on_event("startup")
async def startup():
    await seed_data()

@fastapi_app.on_event("shutdown")
async def shutdown():
    mongo_client.close()

fastapi_app.include_router(api_router)
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
