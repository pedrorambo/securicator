import time
import random

PAIR_REQUEST_EXPIRE_TIME_IN_MILLISECONDS = 30000


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


def random_port():
    return random.randint(50000, 60000)


class PairRequest:
    def __init__(self, from_username, to_username, from_ip):
        self.from_username = from_username
        self.to_username = to_username
        self.from_ip = from_ip
        self.created_at = current_time_in_milliseconds()
        self.from_port = random_port()
        self.to_port = random_port()

    @staticmethod
    def register(from_username, to_username, from_ip):
        PairRequest.clear_from_to(from_username, to_username)
        request = PairRequest(from_username, to_username, from_ip)
        PairRequest.requests.append(request)
        return request

    @staticmethod
    def register_with_ports(from_username, to_username, from_ip, from_port, to_port):
        PairRequest.clear_from_to(from_username, to_username)
        request = PairRequest(from_username, to_username, from_ip)
        request.from_port = from_port
        request.to_port = to_port
        PairRequest.requests.append(request)
        return request

    @staticmethod
    def get_requests_to_username(username):
        requests = []
        for request in PairRequest.requests:
            if request.to_username == username and int(current_time_in_milliseconds()) - int(request.created_at) < PAIR_REQUEST_EXPIRE_TIME_IN_MILLISECONDS:
                requests.append(request)
        return requests

    @staticmethod
    def clear_from_to(from_username, to_username):
        for request in PairRequest.requests:
            if request.from_username == from_username and request.to_username == to_username:
                PairRequest.requests.remove(request)

    @staticmethod
    def expire_pair_requests():
        count = 0
        for request in PairRequest.requests:
            if int(current_time_in_milliseconds()) - int(request.created_at) > PAIR_REQUEST_EXPIRE_TIME_IN_MILLISECONDS:
                PairRequest.requests.remove(request)
                count += 1
        print("Expired " + str(count) + " pair requests")


PairRequest.requests = []
