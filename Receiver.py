from HandshakeSession import HandshakeSession
from SecurePacket import SecurePacket
from Message import Message


class Receiver:
    @staticmethod
    def parse_received_packet(message):
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
                if verb == "HEARTBEAT":
                    timestamp = int(content.split(" ")[1])
                    if friend.last_heartbeat == None or friend.last_heartbeat < (timestamp - 15000):
                        messages = Message.get_all_messages()
                        for message in messages:
                            if message.username == friend.username and message.delivered_at == None:
                                message.send_packet()
                    friend.last_heartbeat = timestamp
