import base64
from Crypto.PublicKey import RSA as RSALib
from Crypto.Hash import SHA256
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Signature import pkcs1_15

class RSA:
    def __init__(self, public_key, private_key = None):
        self.public_key = RSALib.import_key(base64.b64decode(public_key))
        self.public_cipher = PKCS1_OAEP.new(self.public_key)
        self.public_signature = pkcs1_15.new(self.public_key)
        
        if private_key == None:
            self.private_key = None
            self.private_cipher = None
            self.private_signature = None
        else:
            self.private_key = RSALib.import_key(base64.b64decode(private_key))
            self.private_cipher = PKCS1_OAEP.new(self.private_key)
            self.private_signature = pkcs1_15.new(self.private_key)
        
    def encrypt(self, content):
        encrypted_bytes = self.public_cipher.encrypt(content.encode())
        return base64.b64encode(encrypted_bytes).decode("utf-8")
    
    def decrypt(self, content):
        original_message = self.private_cipher.decrypt(base64.b64decode(content))
        return original_message.decode("utf-8")
    
    def sign(self, content):
        return self.private_signature.sign(SHA256.new(content.encode()))
        
    def verify_signature(self, content, signature):
        try:
            self.public_signature.verify(SHA256.new(content.encode()), signature)
        except (ValueError, TypeError):
            raise Exception("The signature is not valid.")
        
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
