"""Authentication — Simple login/signup with SQLite."""
from fastapi import APIRouter
from pydantic import BaseModel
from backend.database import get_db
import hashlib
from typing import Optional, Any

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
    language: Optional[str] = None
    region: Optional[str] = None
    name: Optional[str] = None
    farmer_id: Optional[int] = None


@router.post("/signup")
async def signup(req: SignupRequest):
    db = None
    try:
        db = await get_db()
        # Check if username exists
        cursor = await db.execute("SELECT id FROM users WHERE username = ?", (req.username,))
        existing = await cursor.fetchall()
        
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
    except Exception as e:
        print(f"Signup exception: {type(e).__name__}: {e}")
        return {"status": "error", "message": f"Server error: {str(e)}"}
    finally:
        if db:
            await db.close()


@router.post("/login")
async def login(req: LoginRequest):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM users WHERE username = ? AND password_hash = ?",
            (req.username, hash_pw(req.password)),
        )
        rows = await cursor.fetchall()
        if not rows:
            return {"status": "error", "message": "Invalid username or password"}

        user = dict(rows[0])
        user.pop("password_hash", None)
        return {"status": "ok", "user": user}
    finally:
        await db.close()


@router.put("/profile/{user_id}")
async def update_profile(user_id: int, req: UpdateProfileRequest):
    db = await get_db()
    try:
        updates = []
        params: list[Any] = []
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

        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        rows = await cursor.fetchall()
        if rows:
            user = dict(rows[0])
            user.pop("password_hash", None)
            return {"status": "ok", "user": user}
        return {"status": "error", "message": "User not found"}
    finally:
        await db.close()


@router.get("/user/{user_id}")
async def get_user(user_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        rows = await cursor.fetchall()
        if not rows:
            return {"status": "error", "message": "User not found"}
        user = dict(rows[0])
        user.pop("password_hash", None)
        return {"status": "ok", "user": user}
    finally:
        await db.close()
