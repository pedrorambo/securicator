import socket
import uuid
from RSA import RSA
from AESCipher import AESCipher


def broadcast_message(message):
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    client_socket.sendto(message.encode(),
                         ("127.0.0.1", 12000))
    client_socket.sendto(message.encode(),
                         ("127.0.0.1", 12001))


class HandshakeSession:
    def __init__(self):
        pass

    def received_request(self, raw_content):
        self.pending_requests.append(raw_content)
        pass

    @staticmethod
    def start_new_session(my_user_name, its_name):
        public_key, private_key = RSA.generate_keys_in_base64()
        session = HandshakeSession()
        session.id = str(uuid.uuid4())
        session.my_user_name = my_user_name
        session.its_name = its_name
        session.started_by_me = True
        session.my_public_key = public_key
        session.my_private_key = private_key

        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        message = session.id + " " + "timestamp" + " " + session.my_public_key
        encrypted_message = aes.encrypt(message)
        body = "START_HANDSHAKE_SESSION " + encrypted_message
        broadcast_message(body)

        HandshakeSession.pending_sessions.append(session)

        print("Handshake session requested " + session.id)

    @staticmethod
    def receive_handshake_request(packet_content):
        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        content = aes.decrypt(packet_content)
        id = content.split(" ")[0]
        timestamp = content.split(" ")[1]
        its_public_key = content.split(" ")[2]

        public_key, private_key = RSA.generate_keys_in_base64()

        session = HandshakeSession()
        session.id = id
        session.my_user_name = "myusername"
        session.its_name = "itsusername"
        session.started_by_me = False
        session.its_public_key = its_public_key
        session.my_public_key = public_key
        session.my_private_key = private_key

        HandshakeSession.pending_sessions.append(session)

        message = session.id + " " + "timestamp" + " " + session.my_public_key
        encrypted_message = aes.encrypt(message)
        body = "CONFIRM_HANDSHAKE_SESSION " + encrypted_message
        broadcast_message(body)
        print("Handshake session request received " + session.id)
        # Now, the session can be persisted, and it's not temporary anymore

    @staticmethod
    def receive_handshake_confirmation(packet_content):
        aes = AESCipher(HandshakeSession.my_pre_shared_key)
        content = aes.decrypt(packet_content)
        id = content.split(" ")[0]
        timestamp = content.split(" ")[1]
        its_public_key = content.split(" ")[2]
        for session in HandshakeSession.pending_sessions:
            if session.started_by_me == True and session.id == id:
                print("Handshake session confirmed " + session.id)
                # Now, the session can be persisted, and it's not temporary anymore


HandshakeSession.pending_sessions = []
