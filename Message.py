import socket
import uuid
from Friend import Friend
from RSA import RSA
from AESCipher import AESCipher
import random
import string
import time


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


class Message:
    @staticmethod
    def send(username, message):
        friend = Friend.get_friend_by_username(username)
        symmetric_key = random_symmetric_key()
        encrypted_symmetric_key = RSA.encrypt_with_public_key(
            symmetric_key, friend.its_public_key)
        aes = AESCipher(symmetric_key)
        encrypted_message = aes.encrypt(message)
        content = encrypted_symmetric_key + " " + encrypted_message
        broadcast_message("MESSAGE " + content)
