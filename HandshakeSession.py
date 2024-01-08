import uuid
from App import App
from Friend import Friend
from RSA import RSA
from AESCipher import AESCipher
import random
import string
import time
from Relay import Relay


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


def random_symmetric_key():
    length = 32 # As reported in the WhatsApp Security Whitepaper 2023, 32-byte keys are used by WhatsApp for AES-256 encryption
    char_set = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.sample(char_set*length, length))


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

        aes = AESCipher(App.get_preshared_key())
        message = session.id + " " + current_time_in_milliseconds() + " " + \
            session.my_public_key + " " + session.my_user_name
        encrypted_message = aes.encrypt(message)
        body = "START_HANDSHAKE_SESSION " + encrypted_message
        Relay.send(its_name, body)

        HandshakeSession.pending_sessions.append(session)

    @staticmethod
    def receive_handshake_request(packet_content):
        aes = AESCipher(App.get_preshared_key())
        content = aes.decrypt(packet_content)
        id = content.split(" ")[0]
        timestamp = content.split(" ")[1]
        its_public_key = content.split(" ")[2]
        its_user_name = content.split(" ")[3]

        for session in HandshakeSession.pending_sessions:
            if session.id == id:
                return

        public_key, private_key = RSA.generate_keys_in_base64()

        session = HandshakeSession()
        session.id = id
        session.my_user_name = "myusername"
        session.its_name = its_user_name
        session.started_by_me = False
        session.its_public_key = its_public_key
        session.my_public_key = public_key
        session.my_private_key = private_key

        HandshakeSession.pending_sessions.append(session)

        symmetric_key = random_symmetric_key()
        aes = AESCipher(symmetric_key)
        inner_content = timestamp + " " + session.my_public_key
        encrypted_inner_content = aes.encrypt(inner_content)
        encrypted_symmetric_key = RSA.encrypt_with_public_key(
            symmetric_key, session.its_public_key)

        body = "CONFIRM_HANDSHAKE_SESSION " + session.id + " " + \
            encrypted_symmetric_key + " " + encrypted_inner_content
        Relay.send(session.its_name, body)

        Friend.add_friend(session.my_public_key, session.my_private_key,
                          session.its_public_key, session.its_name)

        print("Friend request accepted from " + session.its_name)

        # Now, the session can be persisted, and it's not temporary anymore

    @staticmethod
    def receive_handshake_confirmation(packet_content):
        id = packet_content.split(" ")[0]
        encrypted_symmetric_key = packet_content.split(" ")[1]
        encrypted_inner_content = packet_content.split(" ")[2]

        for session in HandshakeSession.pending_sessions:
            if session.started_by_me == True and session.id == id:
                symmetric_key = RSA.decrypt_with_private_key(
                    encrypted_symmetric_key, session.my_private_key)
                aes = AESCipher(symmetric_key)
                inner_content = aes.decrypt(encrypted_inner_content)
                timestamp = inner_content.split(" ")[0]
                its_public_key = inner_content.split(" ")[1]
                session.its_public_key = its_public_key
                Friend.add_friend(session.my_public_key, session.my_private_key,
                                  session.its_public_key, session.its_name)
                print(session.its_name + ": Accepted your friend request")
                # Now, the session can be persisted, and it's not temporary anymore


HandshakeSession.pending_sessions = []
