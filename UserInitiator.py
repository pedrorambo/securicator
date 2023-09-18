import socket
from AESCipher import AESCipher

pending_requests = []

class UserInitiation:
    def __init__(self):
        pass

    def received_request(self, raw_content):
        pending_requests.append(raw_content)
        pass

    def initiate(self, client_id, destination_ip, destination_port, pre_shared_key):
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        aes = AESCipher(pre_shared_key)
        message = "REQUEST_INIT " + pre_shared_key
        encrypted_message = aes.encrypt(message)
        client_socket.sendto(encrypted_message.encode(), (destination_ip ,destination_port))