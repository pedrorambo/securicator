import socket
import threading
from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
import os

from SecurePacket import SecurePacket

pre_shared_key = os.environ["COM_PRESHARED_KEY"]
my_username = os.environ["COM_USERNAME"]

HandshakeSession.my_pre_shared_key = pre_shared_key

messages = []

BUFFER_SIZE = 1024
DEFAULT_PORT = 12000

Friend.load()


def udpServer():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.bind(('', DEFAULT_PORT))
    except socket.error as e:
        s.bind(('', DEFAULT_PORT + 1))

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
            if (message.startswith("SECURE_PACKET ")):
                body = " ".join(message.split(" ")[1:])
                response = SecurePacket.parse_received(body)
                if response != None:
                    (friend, content) = response
                    verb = content.split(" ")[0]
                    if verb == "MESSAGE":
                        Message.parse_received_message(friend, content)
                    if verb == "MESSAGE_DELIVERED":
                        Message.parse_message_delivered(friend, content)
                    if verb == "MESSAGE_READ":
                        Message.parse_message_read(friend, content)


thread = threading.Thread(target=udpServer)
thread.start()

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
        Friend.persist()
        Message.persist()
        continue

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
