import threading
import time

from Friend import Friend
from SecurePacket import SecurePacket

class Heartbeat:
    @staticmethod
    def do_heartbeat():
        while True:
            friends = Friend.get_all_friends()
            for friend in friends:
                SecurePacket.send(friend.username, "HEARTBEAT")
            time.sleep(10)

    @staticmethod
    def setup():
        thread = threading.Thread(target=Heartbeat.do_heartbeat)
        thread.start()




