class App:
    def __init__(self, username):
        self.username = username
        self.friends_persistence_file_path = username + "-friends.commsave"
        pass

    def get_username(self):
        return self.username

    def get_friends_persistence_file_path(self):
        return self.friends_persistence_file_path