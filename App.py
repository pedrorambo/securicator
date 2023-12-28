import os

class App:
    @staticmethod
    def get_base_path():
        return "database/"

    @staticmethod
    def set_username(username):
        App.username = username
        os.makedirs(App.get_base_path() + App.get_username() + "/media", exist_ok=True)

    @staticmethod
    def get_username():
        if App.username == None:
            raise Exception("Username not set")
        return App.username

    @staticmethod
    def get_media_path():
        return App.get_base_path() + App.get_username() + "/media/"
    
    @staticmethod
    def get_friends_database_path():
        return App.get_base_path() + App.get_username() + "/friends.commsave"

    @staticmethod
    def get_messages_database_path():
        return App.get_base_path() + App.get_username() + "/messages.commsave"