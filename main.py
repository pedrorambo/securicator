import socket
import threading
import time
from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
import os

from SecurePacket import SecurePacket
from Tunnel import Tunnel

pre_shared_key = os.environ["COM_PRESHARED_KEY"]
my_username = os.environ["COM_USERNAME"]

HandshakeSession.my_pre_shared_key = pre_shared_key

messages = []

BUFFER_SIZE = 1024
DEFAULT_PORT = 12000

Friend.load(my_username)
Message.load(my_username)


def tunnel_keepalive():
    while True:
        time.sleep(1)
        Tunnel.send_tunnel_keepalives()


def tunnel_maintain():
    while True:
        time.sleep(1)
        Tunnel.maintain_tunnels(my_username)


tunnel_maintain_thread = threading.Thread(target=tunnel_maintain)
tunnel_maintain_thread.start()

tunnel_keepalive_thread = threading.Thread(target=tunnel_keepalive)
tunnel_keepalive_thread.start()

while True:
    raw_content = input()

    if raw_content.startswith("friends"):
        Friend.print_user_names()
        continue

    if raw_content.startswith("friend"):
        if len(raw_content.split(" ")) < 2:
            print("friend <username>")
            continue
        friend_username = raw_content.split(" ")[1]
        HandshakeSession.start_new_session(my_username, friend_username)
        continue

    if raw_content.startswith("save"):
        Friend.persist(my_username)
        Message.persist(my_username)
        continue

    if (raw_content.startswith("messages")):
        Message.print_messages()
        continue

    if (raw_content.startswith("tunnel")):
        if len(raw_content.split(" ")) < 2:
            print("tunnel <username>")
            continue
        username = raw_content.split(" ")[1]
        Tunnel.force_tunnel(my_username, username)

    if raw_content.startswith("message"):
        if len(raw_content.split(" ")) < 3:
            print("message <username> <message>")
            continue
        username = raw_content.split(" ")[1]
        message = " ".join(raw_content.split(" ")[2:])
        friend = Friend.get_friend_by_username(username)
        if friend == None:
            print("Friend not found")
        else:
            Message.send(username, message)
        continue
