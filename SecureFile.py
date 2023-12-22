class SecureFile:
    def __init__(self, path):
        self.path = path

    def append_line(self, content):
        with open(self.path, "a") as file:
            file.write(content + "\n")
        
    def read_all_lines(self):
        with open(self.path, "r") as file:
            return file.readlines()

