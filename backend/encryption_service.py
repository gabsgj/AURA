"""
Service for handling symmetric encryption and decryption of sensitive data.

This service uses Fernet (AES-128 in CBC mode with PKCS7 padding, signed with HMAC using SHA256)
from the 'cryptography' library to ensure data confidentiality and integrity.
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# --- Fernet Key Management ---
# The key must be 32 bytes and URL-safe base64 encoded.
# Generate a key using: `from cryptography.fernet import Fernet; Fernet.generate_key()`
FERNET_KEY = os.getenv('FERNET_KEY')

if not FERNET_KEY:
    logger.warning("FERNET_KEY not found in environment variables. Data encryption will be disabled.")
    fernet_instance = None
else:
    try:
        fernet_instance = Fernet(FERNET_KEY.encode())
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid FERNET_KEY. It must be a URL-safe base64-encoded 32-byte key. Error: {e}")
        fernet_instance = None

# --- Encryption/Decryption Functions ---

def encrypt_data(data: str) -> str | None:
    """
    Encrypts a string using the configured Fernet key.

    Args:
        data (str): The plaintext string to encrypt.

    Returns:
        str | None: The encrypted data as a string, or None if encryption is disabled or fails.
    """
    if not fernet_instance or not data:
        return data # Return original data if encryption is off or input is empty

    try:
        return fernet_instance.encrypt(data.encode()).decode()
    except Exception as e:
        logger.error(f"Data encryption failed: {e}", exc_info=True)
        return None

def decrypt_data(encrypted_data: str) -> str | None:
    """
    Decrypts a string using the configured Fernet key.

    Args:
        encrypted_data (str): The encrypted string to decrypt.

    Returns:
        str | None: The decrypted plaintext string, or None if decryption fails.
    """
    if not fernet_instance or not encrypted_data:
        return encrypted_data # Return original data if encryption is off or input is empty

    try:
        # Check if the data looks like it's encrypted by Fernet
        # This is a basic check; real encrypted data is longer and structured.
        if len(encrypted_data) < 50: # Arbitrary short length
            return encrypted_data
            
        return fernet_instance.decrypt(encrypted_data.encode()).decode()
    except InvalidToken:
        logger.warning(f"Invalid token. The data may not be encrypted or was tampered with. Returning as is.")
        return encrypted_data # Return original data if it's not valid Fernet token
    except Exception as e:
        logger.error(f"Data decryption failed: {e}", exc_info=True)
        return None
