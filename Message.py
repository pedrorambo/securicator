import base64
import time
from SecurePacket import SecurePacket
import uuid


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


class Message:
    @staticmethod
    def persist():
        with open("messages.csv", "w") as file:
            for message in Message.messages:
                file.write(message.id + ";" + message.created_at + ";" + message.username +
                           ";" + str(message.content).replace("\n", "").replace(";", "") + "\n")

    @staticmethod
    def send(username, message):
        message_in_base64 = base64.b64encode(message.encode()).decode("utf-8")

        message_entity = Message()
        message_entity.id = str(uuid.uuid4())
        message_entity.username = username
        message_entity.content = message
        message_entity.created_at = current_time_in_milliseconds()

        SecurePacket.send(message_entity.username, "MESSAGE " + message_entity.id +
                          " " + message_entity.created_at + " " + message_in_base64)

        Message.messages.append(message_entity)

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
        Message.messages.append(message_entity)

        SecurePacket.send(friend.username, "MESSAGE_DELIVERED" +
                          " " + id + " " + current_time_in_milliseconds())
        SecurePacket.send(friend.username, "MESSAGE_READ" +
                          " " + id + " " + current_time_in_milliseconds())

    @staticmethod
    def parse_message_delivered(friend, content):
        id = content.split(" ")[1]
        delivered_at = content.split(" ")[2]
        print("[DELIVERED]")

    @staticmethod
    def parse_message_read(friend, content):
        id = content.split(" ")[1]
        read_at = content.split(" ")[2]
        print("[READ]")


Message.messages = []
