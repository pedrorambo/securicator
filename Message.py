import base64
import json
import math
import os
import re
import time
from App import App
from Friend import Friend
from SecureFile import SecureFile
from SecurePacket import SecurePacket
import uuid

from TextSmallMessageEntity import TextSmallMessageEntity

MAX_CONCURRENT_SEQUENTIAL_SEGMENTS_TO_REQUEST = 1
MAX_CONCURRENT_DISTRIBUTED_SEGMENTS_TO_REQUEST = MAX_CONCURRENT_SEQUENTIAL_SEGMENTS_TO_REQUEST

SEGMENT_SIZE_IN_BYTES = 100000

def current_time_in_milliseconds_as_number():
    return round(time.time() * 1000)

def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

def sanitize_filename(input):
    return re.sub(r'[^a-zA-Z0-9\ \-\_]', "_", input)

def file_extension(path):
    _, end = os.path.splitext(path)
    return end.replace(".", "")


class Message:
    @staticmethod
    def persist():
        file = SecureFile(App.get_messages_database_path())
        file.clear()
        for message in Message.messages:
            if message.complete:
                file.append_line(Message.to_json(message))

    @staticmethod
    def fetch_next_segment():
        for message in Message.messages:
            if message.complete or message.sender_username == App.get_username() or message.segment_amount == 0:
                continue
            friend = Friend.get_friend_by_username(message.sender_username)
            if friend.last_heartbeat == None or current_time_in_milliseconds_as_number() - friend.last_heartbeat > 30000:
                continue
            print("Fetching segments: ", str(math.floor((len(message.fetched_segments) / message.segment_amount) * 100)), "%")
            if len(message.fetched_segments) == 0:
                last_segment = min(message.segment_amount - 1, MAX_CONCURRENT_SEQUENTIAL_SEGMENTS_TO_REQUEST)
                Message.fetched_last_segment_at = current_time_in_milliseconds_as_number()
                SecurePacket.send(message.username, "MESSAGE_REQUEST_SEGMENTS " + message.id + " " + "0-" + str(last_segment))
                break
            else:
                last_segment = max(message.fetched_segments)
                if (message.segment_amount - 1) - last_segment > 10:
                    first_segment = last_segment + 1
                    last_segment = min(message.segment_amount - 1, last_segment + MAX_CONCURRENT_SEQUENTIAL_SEGMENTS_TO_REQUEST)
                    Message.fetched_last_segment_at = current_time_in_milliseconds_as_number()
                    SecurePacket.send(message.username, "MESSAGE_REQUEST_SEGMENTS " + message.id + " " + str(first_segment) + "-" + str(last_segment))
                    break
                else:
                    missing_segments = []
                    for i in range(0, message.segment_amount):
                        if str(i) not in message.fetched_segments:
                            missing_segments.append(str(i))
                    segments_to_request = missing_segments[:MAX_CONCURRENT_DISTRIBUTED_SEGMENTS_TO_REQUEST]
                    Message.fetched_last_segment_at = current_time_in_milliseconds_as_number()
                    SecurePacket.send(message.username, "MESSAGE_REQUEST_SEGMENTS " + message.id + " " + ",".join(segments_to_request))
                    break
        

    @staticmethod
    def fetch_segments():
        while(True):
            if (current_time_in_milliseconds_as_number() - Message.fetched_last_segment_at) > 5000:
                Message.fetch_next_segment()
            time.sleep(.5)

    @staticmethod
    def load():
        try:
            with open(App.get_messages_database_path(), "r") as file:
                for line in file.readlines():
                    if len(line) < 3:
                        continue
                    message = Message.from_json(line)
                    Message.messages.append(message)
        except FileNotFoundError:
            pass

    @staticmethod
    def get_by_id(id):
        for message in Message.messages:
            if message.id == id:
                return message

    @staticmethod
    def print_messages():
        for message in Message.messages:
            print("== " + message.id)
            print(" Username: " + message.username)
            print(" Delivered at: " + message.delivered_at)
            print(" Read at: " + message.read_at)
            print(" Content: " + message.content)
            print()

    @staticmethod
    def send(username, message):
        message_entity = Message()
        message_entity.id = str(uuid.uuid4())
        message_entity.username = username
        message_entity.sender_username = App.get_username()
        message_entity.receiver_username = username
        message_entity.content = message
        message_entity.delivered_at = None
        message_entity.read_at = None
        message_entity.created_at = current_time_in_milliseconds()
        message_entity.segments = []
        message_entity.segment_amount = 0
        message_entity.complete = True
        message_entity.type = "text:small"
        message_entity.file_name = None
        message_entity.file_path = None
        message_entity.segment_amount = 0
        message_entity.file_size = 0
        Message.messages.append(message_entity)
        message_entity.send_packet()
        Message.persist()
        
    
    @staticmethod
    def send_text_small(username, content):
        message = TextSmallMessageEntity.create(username, content)
        Message.messages.append(message)
        Message.persist()

    @staticmethod
    def send_file(id, username, file_name, file_path):
        message_entity = Message()
        message_entity.id = id
        message_entity.username = username
        message_entity.sender_username = App.get_username()
        message_entity.receiver_username = username
        message_entity.content = "File"
        message_entity.delivered_at = None
        message_entity.read_at = None
        message_entity.created_at = current_time_in_milliseconds()
        message_entity.segments = []
        message_entity.segment_amount = 0
        message_entity.complete = True
        message_entity.type = "file"
        message_entity.file_name = file_name
        message_entity.file_path = file_path
        size = os.path.getsize(message_entity.file_path)
        segment_amount = math.ceil(size / SEGMENT_SIZE_IN_BYTES)
        message_entity.segment_amount = segment_amount
        message_entity.file_size = size
        Message.messages.append(message_entity)
        message_entity.send_packet()
        Message.persist()

    def send_packet(self):
        message_in_base64 = base64.b64encode(self.content.encode()).decode("utf-8")
        json_content = json.dumps({
            "id": self.id,
            "createdAt": self.created_at,
            "content": message_in_base64,
            "segmentAmount": self.segment_amount,
            "type": self.type,
            "fileSize": self.file_size,
            "fileName": self.file_name,
        })
        SecurePacket.send(self.username, "MESSAGE " + json_content)

    @staticmethod
    def parse_received_message(friend, content):
        json_content = content.split(" ", 1)[1]
        content = json.loads(json_content)

        id = content["id"]
        created_at = content["createdAt"]
        message_in_base64 = content["content"]
        message = base64.b64decode(message_in_base64).decode("utf-8")

        print(friend.username + ": " + message)

        message_entity = Message()
        message_entity.id = id
        message_entity.username = friend.username
        message_entity.receiver_username = App.get_username()
        message_entity.sender_username = friend.username
        message_entity.content = message
        message_entity.created_at = created_at
        message_entity.segments = []
        message_entity.fetched_segments = []
        message_entity.complete = content["segmentAmount"] == 0
        message_entity.segment_amount = content["segmentAmount"]
        message_entity.type = content["type"]
        message_entity.file_size = content["fileSize"]
        message_entity.file_name = content["fileName"]
        if message_entity.type == "text:small":
            message_entity.delivered_at = current_time_in_milliseconds()
            message_entity.read_at = current_time_in_milliseconds()
        else:
            message_entity.delivered_at = None
            message_entity.read_at = None


        if message_entity.type == "file":
            with open(App.get_media_path() + sanitize_filename(message_entity.id) + "." + sanitize_filename(file_extension(message_entity.file_name)), "ab") as f:
                f.seek(message_entity.file_size - 1)
                f.write(b"\0")

        Message.messages.append(message_entity)
        Message.persist()

        if message_entity.type == "text:small":
            SecurePacket.send(friend.username, "MESSAGE_DELIVERED" +
                          " " + id + " " + current_time_in_milliseconds())
            SecurePacket.send(friend.username, "MESSAGE_READ" +
                          " " + id + " " + current_time_in_milliseconds())
        
    @staticmethod
    def parse_segments_requested(friend, content):
        parts = content.split(" ")
        message_id = parts[1]
        segments_text = parts[2]

        segments = []

        if "-" in segments_text:
            start = int(segments_text.split("-")[0])
            end = int(segments_text.split("-")[1])
            for i in range(start, end + 1):
                segments.append(i)
        else:
            for segment in segments_text.split(","):
                segments.append(int(segment))

        message = Message.get_by_id(message_id)
        # TODO: Check if message is from to the correct friend
        if message.type == "file":
            with open(App.get_media_path() + sanitize_filename(message.id) + "." + sanitize_filename(file_extension(message.file_name)), "rb") as f:
                for segment in segments:
                    f.seek(SEGMENT_SIZE_IN_BYTES * segment)
                    data = f.read(SEGMENT_SIZE_IN_BYTES)
                    base64_content = base64.b64encode(data).decode("utf-8")
                    payload = json.dumps({
                        "id": message.id,
                        "index": segment,
                        "content": base64_content
                    })
                    SecurePacket.send(friend.username, "SEGMENT " + payload)
        else:
            return "a"

    @staticmethod
    def parse_received_segment(friend, content):
        Message.fetch_next_segment()

        json_content = content.split(" ", 1)[1]
        content = json.loads(json_content)

        message = Message.get_by_id(content["id"])
        message.fetched_segments.append(int(content["index"]))

        with open(App.get_media_path() + sanitize_filename(content["id"]) + "." + sanitize_filename(file_extension(message.file_name)), "r+b") as f:
            f.seek(int(content["index"]) * SEGMENT_SIZE_IN_BYTES)
            f.write(base64.b64decode(content["content"]))

        if message.segment_amount == len(message.fetched_segments):
            message.complete = True
            message.segment_amount = 0
            message.segments = []
            message.delivered_at = current_time_in_milliseconds()
            message.read_at = current_time_in_milliseconds()
            Message.persist()
            SecurePacket.send(friend.username, "MESSAGE_DELIVERED" +
                          " " + message.id + " " + current_time_in_milliseconds())
            SecurePacket.send(friend.username, "MESSAGE_READ" +
                          " " + message.id + " " + current_time_in_milliseconds())

    @staticmethod
    def parse_message_delivered(friend, content):
        id = content.split(" ")[1]
        delivered_at = content.split(" ")[2]
        message = Message.get_by_id(id)
        message.delivered_at = delivered_at
        Message.persist()
        print(friend.username + ": Message delivered")

    @staticmethod
    def parse_message_read(friend, content):
        id = content.split(" ")[1]
        read_at = content.split(" ")[2]
        message = Message.get_by_id(id)
        message.read_at = read_at
        Message.persist()
        print(friend.username + ": Message read")

    @staticmethod
    def to_json(message):
        return json.dumps({
            "id": message.id,
            "createdAt": message.created_at,
            "username": message.username,
            "senderUsername": message.sender_username,
            "receiverUsername": message.receiver_username,
            "content": message.content,
            "type": message.type,
            "fileName": message.file_name,
            "fileSize": message.file_size,
            "segmentAmount": message.segment_amount,
            "complete": message.complete,
            "deliveredAt": message.delivered_at,
            "readAt": message.read_at
        })
    
    @staticmethod
    def from_json(content):
        parsed = json.loads(content)
        message = Message()
        message.id = parsed["id"]
        message.created_at = parsed["createdAt"]
        message.username = parsed["username"]
        message.sender_username = parsed["senderUsername"]
        message.receiver_username = parsed["receiverUsername"]
        message.content = parsed["content"]
        message.delivered_at = parsed["deliveredAt"]
        message.read_at = parsed["readAt"]
        message.segments = []
        message.segment_amount = parsed["segmentAmount"]
        message.complete = True
        message.type = parsed["type"]
        message.file_name = parsed["fileName"]
        message.file_size = parsed["fileSize"]
        return message
    
    @staticmethod
    def get_all_messages():
        return Message.messages
    
    @staticmethod
    def get_all_messages_from_username(username):
        messages = []
        for message in Message.messages:
            if message.username == username or message.sender_username == username or message.receiver_username == username:
                messages.append(message)
        return messages

Message.messages = []
Message.fetched_last_segment_at = 0