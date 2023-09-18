from RSA import RSA
import random
import string

public, private = RSA.generate_keys_in_base64()

encrypted = RSA.encrypt_with_public_key(
    "a", public)

print(encrypted)

decrypted = RSA.decrypt_with_private_key(encrypted, private)

print(decrypted)


char_set = string.ascii_uppercase + string.ascii_lowercase + string.digits
symmetric = ''.join(random.sample(char_set*100, 100))

print(RSA.encrypt_with_public_key(symmetric, public))
