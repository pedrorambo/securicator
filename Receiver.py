from App import App
from Friend import Friend
from HandshakeSession import HandshakeSession
from SecurePacket import SecurePacket
from Message import Message


class Receiver:
    @staticmethod
    def parse_received_packet(message):
        if (message.startswith("CONFIRM_HANDSHAKE_SESSION")):
            if App.get_handshake_allowed() == True and len(App.get_preshared_key()) >= 8:
                HandshakeSession.receive_handshake_confirmation(
                    " ".join(message.split(" ")[1:]))
        if (message.startswith("START_HANDSHAKE_SESSION")):
            if App.get_handshake_allowed() == True and len(App.get_preshared_key()) >= 8:
                HandshakeSession.receive_handshake_request(
                    message.split(" ")[1])
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
                if verb == "MESSAGE_REQUEST_SEGMENTS":
                    Message.parse_segments_requested(friend, content)
                if verb == "SEGMENT":
                    Message.parse_received_segment(friend, content)
                if verb == "HEARTBEAT":
                    timestamp = int(content.split(" ")[1])
                    bio = " ".join(content.split(" ")[2:])
                    Friend.set_bio(friend, bio)
                    if friend.last_heartbeat == None or friend.last_heartbeat < (timestamp - 15000):
                        messages = Message.get_all_messages()
                        for message in messages:
                            # print(message.delivered_at, message.complete, message.sender_username, message.receiver_username, friend.username)
                            if message.delivered_at == None and message.complete == True and message.sender_username == App.get_username() and message.receiver_username == friend.username:
                                message.send_packet()
                    friend.last_heartbeat = timestamp
