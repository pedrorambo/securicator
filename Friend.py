class Friend:
    def __init__(self):
        pass

    @staticmethod
    def add_friend(my_public_key, my_private_key, its_public_key, username):
        friend = Friend()
        friend.username = username
        friend.my_public_key = my_public_key
        friend.my_private_key = my_private_key
        friend.its_public_key = its_public_key
        Friend.friends.append(friend)

    @staticmethod
    def print_user_names():
        print("Friends:")
        for friend in Friend.friends:
            print(friend.username)

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


Friend.friends = []
