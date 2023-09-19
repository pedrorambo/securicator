class MessageHeader:
    sender_id = ""
    sent_at = ""
    content = ""
    def __init__(self, sender_id, sent_at, content):
        self.sender_id = sender_id
        self.sent_at = sent_at
        self.content = content