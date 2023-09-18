import time
import random

REGISTRATION_EXPIRE_TIME_IN_MILLISECONDS = 30000


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


def random_port():
    return random.randint(50000, 60000)


class Registration:
    def __init__(self, username, ip, port):
        self.created_at = current_time_in_milliseconds()
        self.username = username
        self.ip = ip
        self.port = port

    @staticmethod
    def add(username, ip, port):
        request = Registration(username, ip, port)
        Registration.registrations.append(request)

    @staticmethod
    def get_requests_to_username(username):
        requests = []
        for registration in Registration.registrations:
            if registration.to_username == username and int(current_time_in_milliseconds()) - int(registration.created_at) < REGISTRATION_EXPIRE_TIME_IN_MILLISECONDS:
                requests.append(registration)
        return requests

    @staticmethod
    def get_for_username(username):
        items = []
        for registration in Registration.registrations:
            if registration.username == username:
                items.append(registration)
        return items

    @staticmethod
    def get_ip_from_username(username):
        for registration in Registration.registrations:
            if registration.username == username:
                return registration.ip
        return None

    @staticmethod
    def pop_for_username(username):
        for registration in Registration.registrations:
            if registration.username == username:
                Registration.registrations.remove(registration)
                return registration
        return None

    @staticmethod
    def expire():
        for registration in Registration.registrations:
            if int(current_time_in_milliseconds()) - int(registration.created_at) > REGISTRATION_EXPIRE_TIME_IN_MILLISECONDS:
                Registration.registrations.remove(registration)


Registration.registrations = []
