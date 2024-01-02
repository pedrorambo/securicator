import os
import sys

if "win32" in sys.platform:
    import ctypes

class Notifier:
    @staticmethod
    def notify(title, text):
        try:
            if "darwin" in sys.platform:
                os.system("""
                        osascript -e 'display notification "{}" with title "{}"'
                        """.format(text, title))
            if "win32" in sys.platform:
                MessageBox = ctypes.windll.user32.MessageBoxW
                MessageBox(None, text, title, 0)
        except Exception as e:
            print("Erro in notifier: ", str(e))