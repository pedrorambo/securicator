import base64
import random
import string
from AESCipher import AESCipher
from Friend import Friend
from RSA import RSA
from Tunnel import Tunnel


def random_symmetric_key():
    length = 100
    char_set = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.sample(char_set*length, length))


class SecurePacket:
    @staticmethod
    def send(username, content):
        friend = Friend.get_friend_by_username(username)
        symmetric_key = random_symmetric_key()
        encrypted_symmetric_key = RSA.encrypt_with_public_key(
            symmetric_key, friend.its_public_key)
        aes = AESCipher(symmetric_key)
        encrypted_message = aes.encrypt(
            base64.b64encode(content.encode()).decode("utf-8"))
        content = friend.its_public_key + " " + \
            encrypted_symmetric_key + " " + encrypted_message
        Tunnel.send_to_username(username, "SECURE_PACKET " + content)

    @staticmethod
    def parse_received(raw):
        my_public_key = raw.split(" ")[0]
        encrypted_symmetric_key = raw.split(" ")[1]
        encrypted_content = raw.split(" ")[2]
        friend = Friend.get_friend_by_my_public_key(my_public_key)
        if not friend:
            return None
        symmetric_key = RSA.decrypt_with_private_key(
            encrypted_symmetric_key, friend.my_private_key)
        aes = AESCipher(symmetric_key)
        content = base64.b64decode(aes.decrypt(
            encrypted_content)).decode("utf-8")
        return (friend, content)
