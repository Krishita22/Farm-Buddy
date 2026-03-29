"""Authentication — Simple login/signup with SQLite."""
from fastapi import APIRouter
from pydantic import BaseModel
from backend.database import get_db
import hashlib

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class SignupRequest(BaseModel):
    username: str
    password: str
    name: str
    language: str = "en"
    region: str = "india_gujarat"


class LoginRequest(BaseModel):
    username: str
    password: str


class UpdateProfileRequest(BaseModel):
    language: str = None
    region: str = None
    name: str = None
    farmer_id: int = None


@router.post("/signup")
async def signup(req: SignupRequest):
    db = await get_db()
    try:
        # Check if username exists
        existing = await db.execute_fetchall(
            "SELECT id FROM users WHERE username = ?", (req.username,)
        )
        if existing:
            return {"status": "error", "message": "Username already taken"}

        cursor = await db.execute(
            "INSERT INTO users (username, password_hash, name, language, region) VALUES (?, ?, ?, ?, ?)",
            (req.username, hash_pw(req.password), req.name, req.language, req.region),
        )
        await db.commit()
        user_id = cursor.lastrowid

        return {
            "status": "ok",
            "user": {
                "id": user_id,
                "username": req.username,
                "name": req.name,
                "language": req.language,
                "region": req.region,
            },
        }
    finally:
        await db.close()


@router.post("/login")
async def login(req: LoginRequest):
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM users WHERE username = ? AND password_hash = ?",
            (req.username, hash_pw(req.password)),
        )
        if not rows:
            return {"status": "error", "message": "Invalid username or password"}

        user = dict(rows[0])
        del user["password_hash"]
        return {"status": "ok", "user": user}
    finally:
        await db.close()


@router.put("/profile/{user_id}")
async def update_profile(user_id: int, req: UpdateProfileRequest):
    db = await get_db()
    try:
        updates = []
        params = []
        if req.language:
            updates.append("language = ?")
            params.append(req.language)
        if req.region:
            updates.append("region = ?")
            params.append(req.region)
        if req.name:
            updates.append("name = ?")
            params.append(req.name)
        if req.farmer_id is not None:
            updates.append("farmer_id = ?")
            params.append(req.farmer_id)

        if updates:
            params.append(user_id)
            await db.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()

        rows = await db.execute_fetchall("SELECT * FROM users WHERE id = ?", (user_id,))
        if rows:
            user = dict(rows[0])
            del user["password_hash"]
            return {"status": "ok", "user": user}
        return {"status": "error", "message": "User not found"}
    finally:
        await db.close()


@router.get("/user/{user_id}")
async def get_user(user_id: int):
    db = await get_db()
    try:
        rows = await db.execute_fetchall("SELECT * FROM users WHERE id = ?", (user_id,))
        if not rows:
            return {"status": "error", "message": "User not found"}
        user = dict(rows[0])
        del user["password_hash"]
        return {"status": "ok", "user": user}
    finally:
        await db.close()
