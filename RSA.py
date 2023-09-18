import rsa
import base64


class RSA:
    @staticmethod
    def generate_keys_in_base64():
        public, private = rsa.newkeys(1024)
        public_base_64 = base64.b64encode(public.save_pkcs1("PEM"))
        private_base_64 = base64.b64encode(private.save_pkcs1("PEM"))
        return (public_base_64, private_base_64)
