"""Authentication — Email signup, verification codes, password reset, profile editing."""
from fastapi import APIRouter
from pydantic import BaseModel
from backend.constants import REGION_COORDS, get_coords, use_db, error_response, ok_response
from backend.services.email_service import send_verification_email, send_reset_email
import hashlib
import random
import string
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory verification codes (in production, send via SMS/email)
_verification_codes = {}
_reset_codes = {}


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def generate_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


# ===== SIGNUP =====

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: str = ""
    language: str = "en"
    region: str = "india_gujarat"


# Initiate signup: validate inputs, generate verification code, send email
@router.post("/signup")
async def signup(req: SignupRequest):
    async with use_db() as db:
        # Check if email exists
        existing = await db.execute_fetchall(
            "SELECT id FROM users WHERE username = ?", (req.email,)
        )
        if existing:
            return error_response("This email is already registered. Please log in.")

        # Validate
        if len(req.password) < 4:
            return error_response("Password must be at least 4 characters")
        if not req.name.strip():
            return error_response("Please enter your name")
        if not req.email.strip():
            return error_response("Please enter your email")

        # Generate verification code
        code = generate_code()
        _verification_codes[req.email] = {
            "code": code,
            "data": req.model_dump(),
            "created": datetime.now().isoformat(),
        }

        # Try to send email
        email_sent = send_verification_email(req.email, code, req.name)

        return {
            "status": "verify",
            "message": f"Verification code sent to {req.email}" if email_sent else f"Verification code: {code}",
            "email": req.email,
            "email_sent": email_sent,
            "code": code if not email_sent else None,  # Only show code if email not sent
        }


class VerifyRequest(BaseModel):
    email: str
    code: str


# Verify signup code and create user + farmer records
@router.post("/verify")
async def verify(req: VerifyRequest):
    stored = _verification_codes.get(req.email)
    if not stored:
        return error_response("No pending verification for this email")
    if stored["code"] != req.code:
        return error_response("Invalid verification code")

    # Code matches — create account
    data = stored["data"]
    async with use_db() as db:
        # Create farmer profile
        lat, lng, district = get_coords(data["region"])

        farmer_cursor = await db.execute(
            """INSERT INTO farmers (name, phone, language, village, district, latitude, longitude,
               farm_size_acres, soil_type, soil_ph, irrigation_type)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (data["name"], data.get("phone", ""), data["language"], district, district, lat, lng,
             2.0, "loam", 6.5, "rainfed"),
        )
        farmer_id = farmer_cursor.lastrowid

        # Create user
        cursor = await db.execute(
            "INSERT INTO users (username, password_hash, name, language, region, farmer_id) VALUES (?, ?, ?, ?, ?, ?)",
            (data["email"], hash_pw(data["password"]), data["name"], data["language"], data["region"], farmer_id),
        )
        await db.commit()
        user_id = cursor.lastrowid

        # Clean up verification
        del _verification_codes[req.email]

        return {
            "status": "ok",
            "user": {
                "id": user_id,
                "email": data["email"],
                "name": data["name"],
                "language": data["language"],
                "region": data["region"],
                "farmer_id": farmer_id,
                "phone": data.get("phone", ""),
            },
        }


# ===== LOGIN =====

class LoginRequest(BaseModel):
    email: str
    password: str


# Authenticate user with email + password
@router.post("/login")
async def login(req: LoginRequest):
    async with use_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM users WHERE username = ? AND password_hash = ?",
            (req.email, hash_pw(req.password)),
        )
        if not rows:
            return error_response("Invalid email or password")

        user = dict(rows[0])
        return {
            "status": "ok",
            "user": {
                "id": user["id"],
                "email": user["username"],
                "name": user["name"],
                "language": user["language"],
                "region": user["region"],
                "farmer_id": user["farmer_id"],
            },
        }


# ===== PASSWORD RESET =====

class ResetRequest(BaseModel):
    email: str


# Send a password-reset code to the user's email
@router.post("/forgot-password")
async def forgot_password(req: ResetRequest):
    async with use_db() as db:
        rows = await db.execute_fetchall("SELECT id FROM users WHERE username = ?", (req.email,))
        if not rows:
            return error_response("No account found with this email")

        code = generate_code()
        _reset_codes[req.email] = {"code": code, "created": datetime.now().isoformat()}

        email_sent = send_reset_email(req.email, code)

        return {
            "status": "reset_code_sent",
            "message": f"Reset code sent to {req.email}" if email_sent else f"Reset code: {code}",
            "email_sent": email_sent,
            "code": code if not email_sent else None,
        }


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class DirectResetRequest(BaseModel):
    email: str
    new_password: str


# Reset password directly without a code (admin/dev convenience)
@router.post("/direct-reset")
async def direct_reset(req: DirectResetRequest):
    if len(req.new_password) < 4:
        return error_response("Password must be at least 4 characters")
    async with use_db() as db:
        rows = await db.execute_fetchall("SELECT id FROM users WHERE username = ?", (req.email,))
        if not rows:
            return error_response("No account found with this email")
        await db.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (hash_pw(req.new_password), req.email),
        )
        await db.commit()
        return ok_response("Password reset successfully. You can now log in.")


# Reset password using a previously issued reset code
@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    stored = _reset_codes.get(req.email)
    if not stored or stored["code"] != req.code:
        return error_response("Invalid reset code")
    if len(req.new_password) < 4:
        return error_response("Password must be at least 4 characters")

    async with use_db() as db:
        await db.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (hash_pw(req.new_password), req.email),
        )
        await db.commit()
        del _reset_codes[req.email]
        return ok_response("Password reset successfully. You can now log in.")


# ===== PROFILE =====

class ProfileUpdate(BaseModel):
    name: str = None
    language: str = None
    region: str = None
    phone: str = None
    farm_size_acres: float = None
    soil_type: str = None
    irrigation_type: str = None


# Fetch user profile and associated farm details
@router.get("/profile/{user_id}")
async def get_profile(user_id: int):
    async with use_db() as db:
        rows = await db.execute_fetchall("SELECT * FROM users WHERE id = ?", (user_id,))
        if not rows:
            return error_response("User not found")
        user = dict(rows[0])

        # Get farmer details too
        farmer = {}
        if user.get("farmer_id"):
            frows = await db.execute_fetchall("SELECT * FROM farmers WHERE id = ?", (user["farmer_id"],))
            if frows:
                farmer = dict(frows[0])

        return {
            "status": "ok",
            "user": {
                "id": user["id"],
                "email": user["username"],
                "name": user["name"],
                "language": user["language"],
                "region": user["region"],
                "farmer_id": user["farmer_id"],
            },
            "farm": {
                "size_acres": farmer.get("farm_size_acres"),
                "soil_type": farmer.get("soil_type"),
                "soil_ph": farmer.get("soil_ph"),
                "irrigation_type": farmer.get("irrigation_type"),
                "village": farmer.get("village"),
                "district": farmer.get("district"),
            },
        }


# Update user profile and farmer record fields
@router.put("/profile/{user_id}")
async def update_profile(user_id: int, req: ProfileUpdate):
    async with use_db() as db:
        # Update user table
        user_updates = []
        user_params = []
        if req.name:
            user_updates.append("name = ?")
            user_params.append(req.name)
        if req.language:
            user_updates.append("language = ?")
            user_params.append(req.language)
        if req.region:
            user_updates.append("region = ?")
            user_params.append(req.region)

        if user_updates:
            user_params.append(user_id)
            await db.execute(f"UPDATE users SET {', '.join(user_updates)} WHERE id = ?", user_params)

        # Update farmer table
        rows = await db.execute_fetchall("SELECT farmer_id FROM users WHERE id = ?", (user_id,))
        if rows:
            farmer_id = dict(rows[0])["farmer_id"]
            if farmer_id:
                farmer_updates = []
                farmer_params = []
                if req.name:
                    farmer_updates.append("name = ?")
                    farmer_params.append(req.name)
                if req.phone:
                    farmer_updates.append("phone = ?")
                    farmer_params.append(req.phone)
                if req.farm_size_acres:
                    farmer_updates.append("farm_size_acres = ?")
                    farmer_params.append(req.farm_size_acres)
                if req.soil_type:
                    farmer_updates.append("soil_type = ?")
                    farmer_params.append(req.soil_type)
                if req.irrigation_type:
                    farmer_updates.append("irrigation_type = ?")
                    farmer_params.append(req.irrigation_type)
                if req.language:
                    farmer_updates.append("language = ?")
                    farmer_params.append(req.language)
                if req.region:
                    coords = REGION_COORDS.get(req.region)
                    if coords:
                        farmer_updates.extend(["district = ?", "village = ?", "latitude = ?", "longitude = ?"])
                        farmer_params.extend([coords[2], coords[2], coords[0], coords[1]])

                if farmer_updates:
                    farmer_params.append(farmer_id)
                    await db.execute(f"UPDATE farmers SET {', '.join(farmer_updates)} WHERE id = ?", farmer_params)

        await db.commit()
        return await get_profile(user_id)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# Change password after verifying the current one
@router.post("/change-password/{user_id}")
async def change_password(user_id: int, req: ChangePasswordRequest):
    async with use_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id FROM users WHERE id = ? AND password_hash = ?",
            (user_id, hash_pw(req.old_password)),
        )
        if not rows:
            return error_response("Current password is incorrect")
        if len(req.new_password) < 4:
            return error_response("New password must be at least 4 characters")

        await db.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_pw(req.new_password), user_id),
        )
        await db.commit()
        return ok_response("Password changed successfully")
