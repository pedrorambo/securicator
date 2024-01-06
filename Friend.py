import json
from App import App
from RSA import RSA

from SecureFile import SecureFile


class Friend:
    def __init__(self):
        pass

    @staticmethod
    def persist():
        file = SecureFile(App.get_friends_database_path())
        file.clear()
        for friend in Friend.friends:
            file.append_line(Friend.to_json(friend.username))

    @staticmethod
    def load():
        try:
            file = SecureFile(App.get_friends_database_path())
            lines = file.read_all_lines()
            for line in lines:
                if len(line) > 1:
                    data = json.loads(line)
                    friend = Friend()
                    friend.username = data["username"]
                    friend.my_public_key = data["my_public_key"]
                    friend.my_private_key = data["my_private_key"]
                    friend.its_public_key = data["its_public_key"]
                    friend.bio = data["bio"]
                    friend.last_heartbeat = None
                    friend.my_asymmetric_encryption = RSA(friend.my_public_key, friend.my_private_key)
                    friend.its_asymmetric_encryption = RSA(friend.its_public_key)
                    Friend.friends.append(friend)
        except FileNotFoundError:
            pass
        
    @staticmethod
    def set_bio(friend, bio):
        if friend.bio == bio:
            return
        friend.bio = bio
        Friend.persist()

    @staticmethod
    def add_friend(my_public_key, my_private_key, its_public_key, username):
        existing = Friend.get_friend_by_username(username)
        if existing != None:
            raise Exception("Friend already exists")
        friend = Friend()
        friend.username = username
        friend.my_public_key = my_public_key
        friend.my_private_key = my_private_key
        friend.its_public_key = its_public_key
        friend.my_asymmetric_encryption = RSA(friend.my_public_key, friend.my_private_key)
        friend.its_asymmetric_encryption = RSA(friend.its_public_key)
        friend.bio = ""
        friend.last_heartbeat = None
        Friend.friends.append(friend)
        Friend.persist()

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
                    "its_public_key": friend.its_public_key,
                    "bio": friend.bio
                })

Friend.friends = []
