"""Skin Profile CRM – FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Response,
    UploadFile,
    File,
    Form,
    Query,
    Header,
)
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
APP_NAME = os.environ.get("APP_NAME", "skinprofile")
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@skinprofile.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("skinprofile")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Skin Profile CRM")
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set – storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return storage_key
    except Exception as exc:
        logger.error("Storage init failed: %s", exc)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # storage_key expired – refresh once
        globals()["storage_key"] = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        globals()["storage_key"] = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        "access_token", access, httponly=True, secure=True, samesite="none",
        max_age=8 * 3600, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True, samesite="none",
        max_age=7 * 24 * 3600, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*allowed: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dependency


async def log_action(user: dict, action: str, target: str = "", details: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_role": user["role"],
        "action": action,
        "target": target,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
SkinType = Literal["oily", "dry", "combination", "sensitive", "normal"]
Role = Literal["admin", "consultant", "viewer"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Role = "consultant"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None
    password: Optional[str] = None


class ClientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    first_consultation_date: Optional[str] = None
    skin_type: Optional[SkinType] = None
    concerns: List[str] = []
    allergies: Optional[str] = None
    medical_notes: Optional[str] = None
    previous_products: Optional[str] = None
    current_routine: Optional[str] = None
    reactions: Optional[str] = None


class ConsultationCreate(BaseModel):
    visit_date: str
    treatment: Optional[str] = None
    notes: Optional[str] = None
    recommendations: Optional[str] = None
    products_used: List[str] = []
    follow_up: Optional[str] = None
    before_image_ids: List[str] = []
    after_image_ids: List[str] = []


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
def _public_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in {"_id", "password_hash"}}


@api.post("/auth/register")
async def register(data: UserCreate, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": data.name,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    access = create_access_token(user["id"], email, user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    pub = _public_user(user)
    await log_action(pub, "user.register", target=email)
    return pub


@api.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user["id"], email, user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    pub = _public_user(user)
    await log_action(pub, "user.login", target=email)
    return pub


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    await log_action(user, "user.logout", target=user["email"])
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie(
            "access_token", access, httponly=True, secure=True, samesite="none",
            max_age=8 * 3600, path="/",
        )
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---------------------------------------------------------------------------
# User management (admin)
# ---------------------------------------------------------------------------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api.post("/users")
async def create_user(data: UserCreate, user: dict = Depends(require_role("admin"))):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": data.name,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    await log_action(user, "user.create", target=email, details={"role": data.role})
    return _public_user(new_user)


@api.patch("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, user: dict = Depends(require_role("admin"))):
    update = {}
    if data.name is not None:
        update["name"] = data.name
    if data.role is not None:
        update["role"] = data.role
    if data.password:
        update["password_hash"] = hash_password(data.password)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.find_one_and_update(
        {"id": user_id}, {"$set": update}, return_document=True, projection={"_id": 0, "password_hash": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    await log_action(user, "user.update", target=user_id, details={"fields": list(update.keys())})
    return result


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
    await log_action(user, "user.delete", target=user_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------
@api.get("/clients")
async def list_clients(
    q: Optional[str] = None,
    concern: Optional[str] = None,
    skin_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["full_name"] = {"$regex": q, "$options": "i"}
    if concern:
        query["concerns"] = concern
    if skin_type:
        query["skin_type"] = skin_type
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return clients


@api.post("/clients")
async def create_client(data: ClientCreate, user: dict = Depends(require_role("admin", "consultant"))):
    payload = data.model_dump()
    payload.update({
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_by_name": user.get("name", user["email"]),
    })
    await db.clients.insert_one(payload)
    payload.pop("_id", None)
    await log_action(user, "client.create", target=payload["id"], details={"name": data.full_name})
    return payload


@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    c = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


@api.patch("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate, user: dict = Depends(require_role("admin", "consultant"))):
    update = data.model_dump(exclude_unset=True)
    result = await db.clients.find_one_and_update(
        {"id": client_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    await log_action(user, "client.update", target=client_id)
    return result


@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.clients.delete_one({"id": client_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.consultations.delete_many({"client_id": client_id})
    await log_action(user, "client.delete", target=client_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Consultations
# ---------------------------------------------------------------------------
@api.get("/clients/{client_id}/consultations")
async def list_consultations(
    client_id: str,
    treatment: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {"client_id": client_id}
    if treatment:
        query["treatment"] = {"$regex": treatment, "$options": "i"}
    if start or end:
        date_q: dict = {}
        if start:
            date_q["$gte"] = start
        if end:
            date_q["$lte"] = end
        query["visit_date"] = date_q
    consultations = await db.consultations.find(query, {"_id": 0}).sort("visit_date", -1).to_list(1000)
    return consultations


@api.post("/clients/{client_id}/consultations")
async def create_consultation(
    client_id: str,
    data: ConsultationCreate,
    user: dict = Depends(require_role("admin", "consultant")),
):
    cli = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not cli:
        raise HTTPException(status_code=404, detail="Client not found")
    payload = data.model_dump()
    visit_count = await db.consultations.count_documents({"client_id": client_id})
    payload.update({
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "visit_number": visit_count + 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_by_name": user.get("name", user["email"]),
    })
    await db.consultations.insert_one(payload)
    payload.pop("_id", None)
    await log_action(user, "consultation.create", target=payload["id"], details={"client_id": client_id})
    return payload


@api.delete("/consultations/{consultation_id}")
async def delete_consultation(consultation_id: str, user: dict = Depends(require_role("admin", "consultant"))):
    result = await db.consultations.delete_one({"id": consultation_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Not found")
    await log_action(user, "consultation.delete", target=consultation_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------
MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


@api.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    kind: str = Form("before"),
    user: dict = Depends(require_role("admin", "consultant")),
):
    if kind not in ("before", "after"):
        raise HTTPException(status_code=400, detail="kind must be before or after")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    if ext not in MIME:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    image_id = str(uuid.uuid4())
    path = f"{APP_NAME}/clients/{client_id}/{image_id}.{ext}"
    result = put_object(path, data, MIME[ext])
    doc = {
        "id": image_id,
        "client_id": client_id,
        "kind": kind,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": MIME[ext],
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    }
    await db.images.insert_one(doc)
    doc.pop("_id", None)
    await log_action(user, "image.upload", target=image_id, details={"client_id": client_id, "kind": kind})
    return doc


@api.get("/images/{image_id}")
async def serve_image(
    image_id: str,
    request: Request,
    auth: Optional[str] = Query(None),
):
    # Support both cookie auth and ?auth=token for <img> tags
    token = request.cookies.get("access_token") or auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    record = await db.images.find_one({"id": image_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
    data, content_type = get_object(record["storage_path"])
    return FastAPIResponse(content=data, media_type=record.get("content_type", content_type))


@api.get("/images")
async def list_images(client_id: str, user: dict = Depends(get_current_user)):
    images = await db.images.find(
        {"client_id": client_id, "is_deleted": False}, {"_id": 0, "storage_path": 0}
    ).sort("uploaded_at", -1).to_list(1000)
    return images


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
@api.get("/audit-logs")
async def list_audit_logs(limit: int = 200, user: dict = Depends(require_role("admin"))):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    total_clients = await db.clients.count_documents({})
    total_consultations = await db.consultations.count_documents({})
    total_images = await db.images.count_documents({"is_deleted": False})
    recent_consultations = await db.consultations.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(8).to_list(8)
    recent_clients = await db.clients.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(6).to_list(6)
    # join client names into consultations
    client_ids = list({c["client_id"] for c in recent_consultations})
    clients_map = {}
    if client_ids:
        async for c in db.clients.find({"id": {"$in": client_ids}}, {"_id": 0, "id": 1, "full_name": 1}):
            clients_map[c["id"]] = c["full_name"]
    for c in recent_consultations:
        c["client_name"] = clients_map.get(c["client_id"], "Unknown")
    # 30-day trend
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    new_clients_30d = await db.clients.count_documents({"created_at": {"$gte": thirty_days_ago}})
    return {
        "total_clients": total_clients,
        "total_consultations": total_consultations,
        "total_images": total_images,
        "new_clients_30d": new_clients_30d,
        "recent_consultations": recent_consultations,
        "recent_clients": recent_clients,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.clients.create_index("id", unique=True)
    await db.consultations.create_index([("client_id", 1), ("visit_date", -1)])
    await db.images.create_index([("client_id", 1), ("uploaded_at", -1)])
    await db.audit_logs.create_index([("timestamp", -1)])

    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "name": "Administrator",
            "role": "admin",
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user: %s", ADMIN_EMAIL)
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )
        logger.info("Updated admin password")

    init_storage()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

# CORS – allow credentials, explicit origin (and optional any preview)
origins = [FRONTEND_URL, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"service": "Skin Profile CRM API", "status": "ok"}
