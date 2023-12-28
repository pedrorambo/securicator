import base64
from Crypto.PublicKey import RSA as RSALib
from Crypto.Cipher import PKCS1_OAEP

class RSA:
    @staticmethod
    def generate_keys_in_base64():
        private_key = RSALib.generate(2048)
        private_base_64 = base64.b64encode(private_key.export_key("PEM")).decode("utf-8")
        public_key = private_key.public_key()
        public_base_64 = base64.b64encode(public_key.export_key("PEM")).decode("utf-8")
        return (public_base_64, private_base_64)

    @staticmethod
    def encrypt_with_public_key(content, key):
        key = RSALib.import_key(base64.b64decode(key))
        cipher = PKCS1_OAEP.new(key)
        encrypted_bytes = cipher.encrypt(content.encode())
        return base64.b64encode(encrypted_bytes).decode("utf-8")

    @staticmethod
    def decrypt_with_private_key(content, key):
        key = RSALib.import_key(base64.b64decode(key))
        encrypted_content = base64.b64decode(content)
        cipher = PKCS1_OAEP.new(key)
        original_message = cipher.decrypt(encrypted_content)
        return original_message.decode("utf-8")
