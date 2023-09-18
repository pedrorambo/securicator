class User:
    ip_address = ""
    port = 12000
    defined_name = ""
    sender_public_key = ""
    sender_private_key = ""
    receiver_public_key = ""
    receiver_private_key = ""
    def __init__(self, sender_id, content):
        self.sender_id = sender_id
        self.content = content