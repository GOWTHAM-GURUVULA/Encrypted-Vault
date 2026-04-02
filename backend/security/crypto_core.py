# crypto_core.py
# 1. How will password become a key?
# 2. Where will salt come from?
# 3. Where will IV come from?
# 4. What inputs does encrypt() need?
# 5. What outputs must encrypt() return?
# 6. What happens if password is wrong?
import os
import json
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
SALT_SIZE = 16 
IV_SIZE = 12
KEY_SIZE = 32 
ITERATIONS = 200_000
FORMAT_PREFIX = b"EV2\n"



def derive_key(password:str,salt:bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode())


def _b64encode(value: bytes) -> str:
    return base64.b64encode(value).decode("utf-8")


def _b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode("utf-8"))


def generate_master_key() -> bytes:
    return os.urandom(KEY_SIZE)


def encrypt_with_key(data: bytes, key: bytes) -> dict:
    iv = os.urandom(IV_SIZE)
    aes = AESGCM(key)
    encrypted = aes.encrypt(iv, data, None)
    return {
        "iv": _b64encode(iv),
        "ciphertext": _b64encode(encrypted),
    }


def decrypt_with_key(payload: dict, key: bytes) -> bytes:
    aes = AESGCM(key)
    return aes.decrypt(
        _b64decode(payload["iv"]),
        _b64decode(payload["ciphertext"]),
        None,
    )


def wrap_key(master_key: bytes, secret: str) -> dict:
    salt = os.urandom(SALT_SIZE)
    derived_key = derive_key(secret, salt)
    wrapped = encrypt_with_key(master_key, derived_key)
    wrapped["salt"] = _b64encode(salt)
    return wrapped


def unwrap_key(payload: dict, secret: str) -> bytes:
    salt = _b64decode(payload["salt"])
    derived_key = derive_key(secret, salt)
    return decrypt_with_key(payload, derived_key)


def serialize_vault(encrypted_payload: dict, wrapped_keys: dict) -> bytes:
    return FORMAT_PREFIX + json.dumps(
        {
            "version": 2,
            "encrypted_payload": encrypted_payload,
            "wrapped_keys": wrapped_keys,
        }
    ).encode("utf-8")


def parse_vault(blob: bytes) -> dict | None:
    if not blob.startswith(FORMAT_PREFIX):
        return None

    payload = json.loads(blob[len(FORMAT_PREFIX):].decode("utf-8"))
    return payload


def generate_recovery_key() -> str:
    chunks = []
    raw = base64.b32encode(os.urandom(20)).decode("utf-8").rstrip("=")
    for index in range(0, len(raw), 4):
        chunks.append(raw[index:index + 4])
    return "-".join(chunks)

#    ENCRYPT

def encrypt(data:bytes,password:str)->bytes:

    salt = os.urandom(SALT_SIZE)
    iv = os.urandom(IV_SIZE)
    key = derive_key(password,salt)
    
    # encrypt
    aes = AESGCM(key)
    encrypted = aes.encrypt(iv,data,None)
    return salt+iv+encrypted


# DECRYPT

def decrypt(encrypted_blob:bytes,password:str)->bytes:
    salt = encrypted_blob[:SALT_SIZE]
    iv = encrypted_blob[SALT_SIZE:SALT_SIZE+IV_SIZE]
    ciphertext = encrypted_blob[SALT_SIZE+IV_SIZE:]

    key = derive_key(password,salt)
    aes = AESGCM(key)
    return aes.decrypt(iv,ciphertext,None)
