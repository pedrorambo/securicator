import base64
import random
import socket
import string
from AESCipher import AESCipher
from Friend import Friend
from RSA import RSA


def random_symmetric_key():
    length = 100
    char_set = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.sample(char_set*length, length))


def broadcast_message(message):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    client_socket.sendto(message.encode(),
                         ("127.0.0.1", 12000))
    client_socket.sendto(message.encode(),
                         ("127.0.0.1", 12001))

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
        broadcast_message("SECURE_PACKET " + content)
    
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
