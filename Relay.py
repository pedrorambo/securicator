import socket
import threading
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
        Relay.connected = True
        
    def receive(data):
        Relay.connected = True
        if data:
            Relay.handle_message(data.decode())

    @staticmethod
    def setup(username, handle_message):
        Relay.handle_message = handle_message
                    
        def healthcheck():
            time.sleep(10)
            while True:
                time.sleep(5)
                if Relay.segment.get_last_received() is not None and int(current_time_in_milliseconds()) - int(Relay.segment.get_last_received()) > 15000:
                    print("Realy server timed out, registering again...")
                    Relay.connected = False
                    try:
                        Relay.segment.close()
                        Relay.segment = Segment(App.get_username(), Relay.receive, Relay.server_ip, Relay.server_port)
                        Relay.connected = True
                    except Exception as e:
                        print(str(e))
        

        keepalive_thread = threading.Thread(target=healthcheck)
        keepalive_thread.start()

    @staticmethod
    def send(username, content):
        Relay.segment.send(username, content.encode("utf-8"))

Relay.connected = False