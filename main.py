import socket
import threading
from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
from UserInitiator import UserInitiation

messages = []

HOST = '0.0.0.0'
BUFFER_SIZE = 1024

print("Client ID:")
client_id = input()
port = int(client_id)


def udpServer():
    socket.SO_REUSEADDR
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('', port))
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


def send_message(message, port):
    message_entity = Message(client_id, message)
    messages.append(message_entity)
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("MESG " + client_id + " " +
                         message).encode(), ("127.0.0.1", port))


def send_sync(port):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.sendto(("SYNC " + client_id).encode(), ("127.0.0.1", port))


thread = threading.Thread(target=udpServer)
thread.start()
print("running...")

send_sync(12000)
send_sync(12001)

pre_shared_key = input("Pre-shared key: ")
HandshakeSession.my_pre_shared_key = pre_shared_key

while True:
    raw_content = input()

    if raw_content.startswith("friends"):
        Friend.print_user_names()
        continue

    if raw_content.startswith("friend"):
        my_user_name = input("Your user name: ")
        its_user_name = input("Your friend's user name: ")
        HandshakeSession.start_new_session(my_user_name, its_user_name)
        continue

    if raw_content.startswith("message"):
        username = raw_content.split(" ")[1]
        message = " ".join(raw_content.split(" ")[2:])
        Message.send(username, message)
        continue

    if raw_content.startswith("add"):
        client_id = raw_content.split(" ")[1]
        destination_address = raw_content.split(" ")[2]
        destination_port = int(raw_content.split(" ")[3])
        pre_shared_key = raw_content.split(" ")[4]

        initiator = UserInitiation()
        initiator.initiate(client_id, destination_address,
                           destination_port, pre_shared_key)

    continue

    if raw_content:
        destination_id = raw_content.split(" ")[0]
        message = " ".join(raw_content.split(" ")[1:])
        send_message(message, int(destination_id))
    else:
        print("Stored messages:")
        for message in messages:
            print(message.sender_id + ": " + message.content)
