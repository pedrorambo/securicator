import os


class TerminalForm:
    @staticmethod
    def text():
        return TerminalForm()

    @staticmethod
    def unsigned_integer_between():
        return TerminalForm()

    def __init__(self):
        self.message = ""
        self.default_value = None
        self.is_required = False
        self.environment_default = None

    def prompt_message(self, message):
        self.message = message
        return self

    def required(self):
        if self.default_value != None:
            raise Exception(
                "Terminal form cannot be set as required because it already has a default value.")
        self.is_required = True
        return self

    def default(self, value):
        if self.is_required:
            raise Exception(
                "Terminal form cannot have a default value because it is required.")
        self.default_value = value
        return self

    def default_from_environment_variable(self, environment_variable_name):
        if os.environ.__contains__(environment_variable_name):
            read = os.environ[environment_variable_name]
            if len(read) > 0:
                self.environment_default = read
        return self

    def _get_prompt_message(self):
        if self.default_value != None:
            return self.message + " [" + self.default_value + "]: "
        else:
            return self.message + ": "

    def read(self):
        if self.environment_default != None:
            return self.environment_default
        value = None
        while (value == None):
            input_value = input(self._get_prompt_message())
            if len(input_value) >= 1:
                value = input_value
            else:
                if self.is_required == True:
                    print("This field is required.")
                if self.default_value:
                    value = self.default_value
                else:
                    print("This field doesnt have a default value.")
        return value
