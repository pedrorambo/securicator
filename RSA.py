import rsa
import base64


class RSA:
    @staticmethod
    def generate_keys_in_base64():
        public, private = rsa.newkeys(1024)
        public_base_64 = base64.b64encode(
            public.save_pkcs1("PEM")).decode("utf-8")
        private_base_64 = base64.b64encode(
            private.save_pkcs1("PEM")).decode("utf-8")
        return (public_base_64, private_base_64)

    @staticmethod
    def encrypt_with_public_key(content, key):
        public_key = rsa.PublicKey.load_pkcs1(base64.b64decode(key))
        encrypted_bytes = rsa.encrypt(content.encode(), public_key)
        return base64.b64encode(encrypted_bytes).decode("utf-8")

    @staticmethod
    def decrypt_with_private_key(content, key):
        private_key = rsa.PrivateKey.load_pkcs1(base64.b64decode(key))
        encrypted_content = base64.b64decode(content)
        message = rsa.decrypt(encrypted_content, private_key)
        return message.decode("utf-8")
