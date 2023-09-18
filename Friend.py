import socket
import random
import string
import time


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


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


class Friend:
    def __init__(self):
        pass

    @staticmethod
    def add_friend(my_public_key, my_private_key, its_public_key, username):
        friend = Friend()
        friend.username = username
        friend.my_public_key = my_public_key
        friend.my_private_key = my_private_key
        friend.its_public_key = its_public_key
        Friend.friends.append(friend)

    @staticmethod
    def print_user_names():
        print("Friends:")
        for friend in Friend.friends:
            print(friend.username)


Friend.friends = []
