class SecureFile:
    def __init__(self, path):
        self.path = path

    def close_reader(self):
        if self.reader != None:
            self.reader.close()

    def read_line(self):
        if self.reader is None:
            self.reader = open(self.path, "r")
        return self.reader.readline()

    def clear(self):
        with open(self.path, "w") as file:
            file.write("")

    def append_line(self, content):
        with open(self.path, "a") as file:
            file.write(content + "\n")
        
    def read_all_lines(self):
        with open(self.path, "r") as file:
            return file.readlines()

