import os

from Friend import Friend
from HandshakeSession import HandshakeSession
from Message import Message
from Receiver import Receiver
from Relay import Relay
from TerminalForm import TerminalForm

my_username = TerminalForm.text().required().default_from_environment_variable(
    "COM_USERNAME").prompt_message("Enter your username").read()

pre_shared_key = TerminalForm.text().default_from_environment_variable(
    "COM_PRESHARED_KEY").default("123456").prompt_message("Enter your pre-shared key").read()

relay_server_ip = TerminalForm.text().default_from_environment_variable(
    "COM_RELAY_IP").required().prompt_message("Enter the relay server IP address").read()

relay_server_port = int(TerminalForm.text().default_from_environment_variable(
    "COM_RELAY_PORT").default("5000").prompt_message("Enter the relay server port").read())


Relay.set_server(relay_server_ip, relay_server_port)

print("Setup finished. The app is ready.")
print("Available commands: friend message tunnel messages save")


HandshakeSession.my_pre_shared_key = pre_shared_key

messages = []

BUFFER_SIZE = 1024
DEFAULT_PORT = 12000

Friend.load(my_username)
Message.load(my_username)


def handle_message(data):
    Receiver.parse_received_packet(data)


Relay.setup(my_username, handle_message)

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
