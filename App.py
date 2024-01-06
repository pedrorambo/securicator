import json
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
    def set_allow_handshake(allowed):
        App.allow_handshake = allowed
        
    @staticmethod
    def get_handshake_allowed():
        return App.allow_handshake
    
    @staticmethod
    def get_bio():
        return App.bio
        
    @staticmethod
    def set_secret(secret):
        App.secret = secret
        
    @staticmethod
    def persist_settings():
        json_content = json.dumps({
            "allowHandshake": App.allow_handshake,
            "preSharedKey": App.secret,
            "bio": App.bio
        })
        with open(App.get_config_database_path(), "w") as f:
            f.write(json_content)

    @staticmethod
    def load_settings():
        try:
            with open(App.get_config_database_path(), "r") as f:
                content = json.load(f)
                App.set_secret(content["preSharedKey"])
                App.set_bio(content["bio"])
                App.set_allow_handshake(content["allowHandshake"])
        except FileNotFoundError:
            pass
        
    @staticmethod
    def get_preshared_key():
        if App.secret == None:
            raise Exception("Pre-shared key not set")
        return App.secret
        
    @staticmethod
    def set_bio(content):
        App.bio = content

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
    def get_config_database_path():
        return App.get_base_path() + App.get_username() + "/config.json"

    @staticmethod
    def get_messages_database_path():
        return App.get_base_path() + App.get_username() + "/messages.commsave"
    
App.secret = ""
App.allow_handshake = False
App.bio = ""