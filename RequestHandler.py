class RequestHandler:
    def __init__(self, method, path, function):
        self.method = method
        self.path = path
        self.function = function

    def set_base_dir(self, base_dir):
        self.base_dir = base_dir