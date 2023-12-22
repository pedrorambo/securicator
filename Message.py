import base64
import json
import time
from SecureFile import SecureFile
from SecurePacket import SecurePacket
import uuid


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


class Message:
    @staticmethod
    def persist(username):
        file = SecureFile(username + "-messages.commsave")
        file.clear()
        for message in Message.messages:
            file.append_line(Message.to_json(message))

    @staticmethod
    def load(username):
        return
        try:
            with open(username + "-messages.csv", "r") as file:
                for line in file.readlines():
                    message = Message()
                    line = line.replace("\n", "")
                    message.id = line.split(';')[0]
                    message.created_at = line.split(';')[1]
                    message.username = line.split(';')[2]
                    message.content = line.split(';')[3]
                    message.delivered_at = line.split(';')[4]
                    message.read_at = line.split(';')[5]
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
        message_in_base64 = base64.b64encode(message.encode()).decode("utf-8")

        message_entity = Message()
        message_entity.id = str(uuid.uuid4())
        message_entity.username = username
        message_entity.content = message
        message_entity.delivered_at = None
        message_entity.read_at = None
        message_entity.created_at = current_time_in_milliseconds()
        message_entity.send_packet()
        Message.messages.append(message_entity)

    def send_packet(self):
        message_in_base64 = base64.b64encode(self.content.encode()).decode("utf-8")
        SecurePacket.send(self.username, "MESSAGE " + self.id +
                          " " + self.created_at + " " + message_in_base64)

    @staticmethod
    def parse_received_message(friend, content):
        id = content.split(" ")[1]
        created_at = content.split(" ")[2]
        message_in_base64 = content.split(" ")[3]
        message = base64.b64decode(message_in_base64).decode("utf-8")
        print(friend.username + ": " + message)

        message_entity = Message()
        message_entity.id = id
        message_entity.username = friend.username
        message_entity.content = message
        message_entity.created_at = created_at
        message_entity.delivered_at = current_time_in_milliseconds()
        message_entity.read_at = current_time_in_milliseconds()
        Message.messages.append(message_entity)

        SecurePacket.send(friend.username, "MESSAGE_DELIVERED" +
                          " " + id + " " + current_time_in_milliseconds())
        SecurePacket.send(friend.username, "MESSAGE_READ" +
                          " " + id + " " + current_time_in_milliseconds())

    @staticmethod
    def parse_message_delivered(friend, content):
        id = content.split(" ")[1]
        delivered_at = content.split(" ")[2]
        message = Message.get_by_id(id)
        message.delivered_at = delivered_at
        print(friend.username + ": Message delivered")

    @staticmethod
    def parse_message_read(friend, content):
        id = content.split(" ")[1]
        read_at = content.split(" ")[2]
        message = Message.get_by_id(id)
        message.read_at = read_at
        print(friend.username + ": Message read")

    @staticmethod
    def to_json(message):
        return json.dumps({
            "id": message.id,
            "created_at": message.created_at,
            "username": message.username,
            "content": message.content,
            "delivered_at": message.delivered_at,
            "read_at": message.read_at
        })
    
    @staticmethod
    def get_all_messages():
        return Message.messages


Message.messages = []
