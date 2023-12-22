import threading
import time

from Friend import Friend
from SecurePacket import SecurePacket

def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

class Heartbeat:
    @staticmethod
    def do_heartbeat():
        while True:
            friends = Friend.get_all_friends()
            for friend in friends:
                SecurePacket.send(friend.username, "HEARTBEAT " + current_time_in_milliseconds())
            time.sleep(10)

    @staticmethod
    def setup():
        thread = threading.Thread(target=Heartbeat.do_heartbeat)
        thread.start()




