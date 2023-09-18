import socket
import uuid
from AESCipher import AESCipher


class HandshakeSession:
    def __init__(self):
        pass

    def received_request(self, raw_content):
        self.pending_requests.append(raw_content)
        pass

    @staticmethod
    def start_new_session(my_user_name, its_name):
        session = HandshakeSession()
        session.id = str(uuid.uuid4())
        session.my_user_name = my_user_name
        session.its_name = its_name
        session.started_by_me = True

        client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        message = session.id + " " + "timestamp" + " " + "pubkey"
        encrypted_message = aes.encrypt(message)
        body = ("START_HANDSHAKE_SESSION " + encrypted_message).encode()
        client_socket.sendto(body,
                             ("127.0.0.1", 12000))
        client_socket.sendto(body,
                             ("127.0.0.1", 12001))
        HandshakeSession.pending_requests.append(session)

    @staticmethod
    def receive_handshake_start(packet_content):
        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        content = aes.decrypt(packet_content)
        id = content.split(" ")[0]
        timestamp = content.split(" ")[1]
        its_public_key = content.split(" ")[2]
        print(content)

    @staticmethod
    def receive_handshake_confirmation(packet_content):
        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        content = aes.decrypt(packet_content)
        id = content.split(" ")[0]
        timestamp = content.split(" ")[1]
        its_public_key = content.split(" ")[2]
        print(content)


HandshakeSession.pending_sessions = []
