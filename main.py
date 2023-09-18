import socket
import threading
from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
import os

pre_shared_key = os.environ["COM_PRESHARED_KEY"]
my_username = os.environ["COM_USERNAME"]

HandshakeSession.my_pre_shared_key = pre_shared_key

messages = []

HOST = '0.0.0.0'
BUFFER_SIZE = 1024

port = 12000


def udpServer():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.bind(('', port))
    except socket.error as e:
        s.bind(('', port + 1))

    while True:
        data = s.recvfrom(BUFFER_SIZE)
        if data:
            message = data[0].decode()
            if (message.startswith("CONFIRM_HANDSHAKE_SESSION")):
                HandshakeSession.receive_handshake_confirmation(
                    " ".join(message.split(" ")[1:]))
            if (message.startswith("START_HANDSHAKE_SESSION")):
                HandshakeSession.receive_handshake_request(
                    message.split(" ")[1])
            if (message.startswith("MESSAGE ")):
                body = " ".join(message.split(" ")[1:])
                Message.parse_received_message(body)


thread = threading.Thread(target=udpServer)
thread.start()

while True:
    raw_content = input()

    if raw_content.startswith("friends"):
        Friend.print_user_names()
        continue

    if raw_content.startswith("friend"):
        friend_username = raw_content.split(" ")[1]
        HandshakeSession.start_new_session(my_username, friend_username)
        continue

    if raw_content.startswith("message"):
        username = raw_content.split(" ")[1]
        message = " ".join(raw_content.split(" ")[2:])
        Message.send(username, message)
        continue
