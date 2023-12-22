class Friend:
    def __init__(self):
        pass

    @staticmethod
    def persist(username):
        with open(username+"-friends.csv", "w") as file:
            for friend in Friend.friends:
                file.write(friend.username + ";" + friend.my_public_key + ";" +
                           friend.my_private_key + ";" + friend.its_public_key +
                           "\n")

    @staticmethod
    def load(username):
        try:
            with open(username + "-friends.csv", "r") as file:
                for line in file.readlines():
                    friend = Friend()
                    line = line.replace("\n", "")
                    friend.username = line.replace("\n", "").split(";")[0]
                    friend.my_public_key = line.replace("\n", "").split(";")[1]
                    friend.my_private_key = line.replace(
                        "\n", "").split(";")[2]
                    friend.its_public_key = line.replace(
                        "\n", "").split(";")[3]
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
        Friend.friends.append(friend)

    @staticmethod
    def print_user_names():
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

    @staticmethod
    def get_all_friends():
        return Friend.friends


Friend.friends = []
