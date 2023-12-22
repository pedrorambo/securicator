import json

from SecureFile import SecureFile


class Friend:
    def __init__(self):
        pass

    @staticmethod
    def persist(my_username):
        file = SecureFile(my_username + "-friends.commsave")
        file.clear()
        for friend in Friend.friends:
            file.append_line(Friend.to_json(friend.username))

    @staticmethod
    def load(username):
        try:
            file = SecureFile(username + "-friends.commsave")
            lines = file.read_all_lines()
            for line in lines:
                if len(line) > 1:
                    data = json.loads(line)
                    friend = Friend()
                    friend.username = data["username"]
                    friend.my_public_key = data["my_public_key"]
                    friend.my_private_key = data["my_private_key"]
                    friend.its_public_key = data["its_public_key"]
                    friend.last_heartbeat = None
                    Friend.friends.append(friend)
        except FileNotFoundError:
            pass

    @staticmethod
    def add_friend(my_public_key, my_private_key, its_public_key, username):
        friend = Friend()
        friend.username = username
        friend.my_public_key = my_public_key
        friend.my_private_key = my_private_key
        friend.its_public_key = its_public_key
        friend.last_heartbeat = None
        Friend.friends.append(friend)

    @staticmethod
    def print_user_names():
        for friend in Friend.friends:
            print(friend.username + ": " + str(friend.last_heartbeat))

    @staticmethod
    def get_friend_by_username(username):
        for friend in Friend.friends:
            if friend.username == username:
                return friend

    @staticmethod
    def get_friend_by_my_public_key(my_public_key):
        for friend in Friend.friends:
            if friend.my_public_key == my_public_key:
                return friend

    @staticmethod
    def get_all_friends():
        return Friend.friends
    
    @staticmethod
    def to_json(username):
        for friend in Friend.friends:
            if(friend.username == username):  
                return json.dumps({
                    "username": friend.username,
                    "my_public_key": friend.my_public_key,
                    "my_private_key": friend.my_private_key,
                    "its_public_key": friend.its_public_key
                })

Friend.friends = []
