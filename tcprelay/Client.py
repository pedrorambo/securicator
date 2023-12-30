import time


def current_time_in_milliseconds():
    return str(round(time.time() * 1000))

class Client:
    def __init__(self, username, connection):
        self.username = username
        self.connection = connection
        self.last_keepalive = current_time_in_milliseconds()
        
    @staticmethod
    def get_by_username(username):
        clients = []
        for client in Client.clients:
            if client.username == username:
                clients.append(client)
        return clients
        
Client.clients = []