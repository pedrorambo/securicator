import time
from App import App

from Segment import Segment

def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

class Relay:
    @staticmethod
    def set_server(server, port):
        Relay.server_ip = server
        Relay.server_port = port
        Relay.segment = Segment(App.get_username(), Relay.receive, Relay.server_ip, Relay.server_port)
        
    def receive(data):
        if data:
            decoded = None
            try:
                decoded = data.decode()
            except Exception as e:
                print("Failed to decode received message: ", str(e))
            if decoded != None:
                Relay.handle_message(data.decode())

    @staticmethod
    def setup(username, handle_message):
        Relay.handle_message = handle_message

    @staticmethod
    def send(username, content):
        Relay.segment.send(username, content.encode("utf-8"))