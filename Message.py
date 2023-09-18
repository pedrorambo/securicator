class Message:
    sender_id = ""
    content = ""
    def __init__(self, sender_id, content):
        self.sender_id = sender_id
        self.content = content