from cryptography.fernet import Fernet


class SalaryEncryptor:
    """Handles encryption/decryption of sensitive salary data."""

    def __init__(self, key: bytes):
        self.fernet = Fernet(key)

    def encrypt(self, value: str) -> str:
        """Encrypt a plaintext value and return the encrypted string."""
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: str) -> str:
        """Decrypt an encrypted value and return the plaintext string."""
        return self.fernet.decrypt(encrypted_value.encode()).decode()

    @staticmethod
    def mask(value: str) -> str:
        """Mask a salary value with asterisks, showing only last 2 chars.

        Examples:
            "75000.00" -> "******00"
            "120000" -> "****00"
        """
        if len(value) <= 2:
            return "*" * len(value)
        return "*" * (len(value) - 2) + value[-2:]
