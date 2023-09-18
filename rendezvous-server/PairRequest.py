import time
import random


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))


def random_port():
    return random.randint(3000, 60000)


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
        request = PairRequest(from_username, to_username, from_ip)
        PairRequest.requests.append(request)

    @staticmethod
    def get_requests_to_username(username):
        requests = []
        for request in PairRequest.requests:
            if request.to_username == username:
                requests.append(request)
        return requests

    @staticmethod
    def expire_pair_requests():
        count = 0
        for request in PairRequest.requests:
            if int(current_time_in_milliseconds()) - int(request.created_at) > 30000:
                PairRequest.requests.remove(request)
                count += 1
        print("Expired " + str(count) + " pair requests")


PairRequest.requests = []
