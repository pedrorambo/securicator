import base64
import os
import re
import threading
import uuid
from App import App

from Friend import Friend
from HandshakeSession import HandshakeSession
from Heartbeat import Heartbeat
from Message import Message
from Receiver import Receiver
from Relay import Relay
from RestApi import RestApi
from TerminalForm import TerminalForm

def sanitize_filename(input):
    return re.sub(r'[^a-zA-Z0-9\ \-\_]', "_", input)


my_username = TerminalForm.text().required().default_from_environment_variable(
    "COM_USERNAME").prompt_message("Enter your username").read()

pre_shared_key = TerminalForm.text().default_from_environment_variable(
    "COM_PRESHARED_KEY").default("123456").prompt_message("Enter your pre-shared key").read()

relay_server_ip = TerminalForm.text().default_from_environment_variable(
    "COM_RELAY_IP").default("161.35.126.56").prompt_message("Enter the relay server IP address").read()

relay_server_port = int(TerminalForm.text().default_from_environment_variable(
    "COM_RELAY_PORT").default("5000").prompt_message("Enter the relay server port").read())



print("Setup finished. The app is ready.")
print("Available commands: friend message messages save")

App.set_username(my_username)

Relay.set_server(relay_server_ip, relay_server_port)
HandshakeSession.my_pre_shared_key = pre_shared_key

Friend.load()
Message.load()

fetch_segments_thread = threading.Thread(target=Message.fetch_segments)
fetch_segments_thread.start()


def handle_message(data):
    Receiver.parse_received_packet(data)


Relay.setup(my_username, handle_message)
Heartbeat.setup()

def get_friends(query, body):
    parsed_friends = []
    for friend in Friend.get_all_friends():
        parsed_friends.append({
            "username": friend.username,
            "lastHeartbeat": friend.last_heartbeat
        })
    return parsed_friends

def get_status(query, body):
    return {
        "relayConnected": Relay.segment.connected,
        "unreadMessages": Message.get_unread_messages_count()
    }

def get_messages(query, body):
    username = query["username"][0]
    before = query.get("before")
    if before != None:
        before = before[0]
    parsed = []
    for message in Message.get_last_messages_from_username(username, before):
        parsed.append({
            "id": message.id,
            "createdAt": message.created_at,
            "username": message.username,
            "receiverUsername": message.receiver_username,
            "senderUsername": message.sender_username,
            "content": message.content,
            "deliveredAt": message.delivered_at,
            "readAt": message.read_at,
            "fileName": message.file_name
        })
    return parsed

def send_message(query, body):
    friend = Friend.get_friend_by_username(body["username"])
    if friend == None:
        print("Friend not found")
    else:
        if body["type"] == "file":
            id = str(uuid.uuid4())
            _, file_extension = os.path.splitext(body["filename"])
            file_path = App.get_media_path() + id + "." + sanitize_filename(file_extension.replace(".", ""))
            with open(file_path, "wb") as f:
                f.write(base64.b64decode(body["contentInBase64"]))
            Message.send_file(id, friend.username, body["filename"], file_path)
        else:
            Message.send(friend.username, body["message"])
            
def add_friend(query, body):
    friend = Friend.get_friend_by_username(body["username"])
    if friend == None:
        HandshakeSession.start_new_session(my_username, body["username"])

def set_reads(query, body):
    ids = body["ids"]
    Message.set_read(ids)

api = RestApi()
api.get("/friends", get_friends)
api.get("/messages", get_messages)
api.get("/status", get_status)
api.post("/messages", send_message)
api.post("/add-friend", add_friend)
api.post("/reads", set_reads)
api.serve_files("/media", App.get_media_path())
try:
    api_thread = threading.Thread(target=api.listen, args=("127.0.0.1", 8000))
    api_thread.start()
except: 
    pass


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

    if (raw_content.startswith("messages")):
        Message.print_messages()
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