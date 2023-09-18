import socket
import threading
from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
from UserInitiator import UserInitiation
import os

pre_shared_key = os.environ["COM_PRESHARED_KEY"]
my_username = os.environ["COM_USERNAME"]

HandshakeSession.my_pre_shared_key = pre_shared_key

messages = []

HOST = '0.0.0.0'
BUFFER_SIZE = 1024

port = 12000


def udpServer():
    socket.SO_REUSEADDR
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

            if (message.startswith("PING")):
                print("Ping received, and sent.")
                s.sendto("PONG".encode(), data[1])
            if (message.startswith("MESG")):
                content = " ".join(message.split(" ")[2:])
                message_entity = Message(message.split(" ")[1], content)
                messages.append(message_entity)
                print(content)
            if (message.startswith("SYNC")):
                print("Sync requested")
                for msg in messages:
                    s.sendto(("MESG " + msg.sender_id + " " + msg.content).encode(),
                             ("127.0.0.1", int(message.split(" ")[1])))

    s.close()


thread = threading.Thread(target=udpServer)
thread.start()
# print("running...")

# send_sync(12000)
# send_sync(12001)


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

    continue

    if raw_content:
        destination_id = raw_content.split(" ")[0]
        message = " ".join(raw_content.split(" ")[1:])
        send_message(message, int(destination_id))
    else:
        print("Stored messages:")
        for message in messages:
            print(message.sender_id + ": " + message.content)
