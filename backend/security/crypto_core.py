# crypto_core.py
# 1. How will password become a key?
# 2. Where will salt come from?
# 3. Where will IV come from?
# 4. What inputs does encrypt() need?
# 5. What outputs must encrypt() return?
# 6. What happens if password is wrong?
import os
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
SALT_SIZE = 16 
IV_SIZE = 12
KEY_SIZE = 32 
ITERATIONS = 200_000



def derive_key(password:str,salt:bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode())

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
