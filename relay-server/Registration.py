import time
import random

REGISTRATION_EXPIRE_TIME_IN_MILLISECONDS = 30000


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

class Registration:
    def __init__(self, username, ip, port, socket):
        self.created_at = current_time_in_milliseconds()
        self.username = username
        self.ip = ip
        self.port = port
        self.socket = socket
        self.last_response = current_time_in_milliseconds()

    @staticmethod
    def add(username, ip, port, socket):
        request = Registration(username, ip, port, socket)
        Registration.registrations.append(request)

    @staticmethod
    def update_last_response(username, ip, port):
        for registration in Registration.registrations:
            if registration.username == username and registration.ip == ip and registration.port == port:
                registration.last_response = current_time_in_milliseconds()

    @staticmethod
    def send_message(username, content):
        for registration in Registration.registrations:
            if registration.username == username:
                registration.socket.sendto(content.encode(), (registration.ip, registration.port))

    @staticmethod
    def send_keepalives():
        for registration in Registration.registrations:
            registration.socket.sendto("KEEPALIVE".encode(), (registration.ip, registration.port))

Registration.registrations = []
