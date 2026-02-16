import os
from cryptography.fernet import Fernet


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(32).hex()
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or \
        "sqlite:///" + os.path.join(os.path.abspath(os.path.dirname(__file__)), "instance", "app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "uploads")
    GENERATED_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "generated")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    ALLOWED_EXTENSIONS = {"docx"}

    # Encryption key for salary data - generate once and store
    _key_file = os.path.join(os.path.abspath(os.path.dirname(__file__)), "instance", ".encryption_key")
    if os.path.exists(_key_file):
        with open(_key_file, "rb") as f:
            ENCRYPTION_KEY = f.read()
    else:
        ENCRYPTION_KEY = Fernet.generate_key()
        os.makedirs(os.path.dirname(_key_file), exist_ok=True)
        with open(_key_file, "wb") as f:
            f.write(ENCRYPTION_KEY)
