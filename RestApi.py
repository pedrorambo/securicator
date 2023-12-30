from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import re
from RequestHandler import RequestHandler
from urllib.parse import urlparse
from urllib.parse import parse_qs

def file_extension(path):
    _, end = os.path.splitext(path)
    return end.replace(".", "")

def file_name(path):
    name, _ = os.path.splitext(path)
    return name

def sanitize_filename(input):
    return re.sub(r'[^a-zA-Z0-9\ \-\_]', "_", input)

class BaseServer(BaseHTTPRequestHandler):
    def general_handler(self, method):
        try:
            parts = self.path.split("?")
            parsed_url = urlparse(self.path)
            query = parse_qs(parsed_url.query)
            path = parts[0]
            found = False 

            body = None

            content_len_raw = self.headers.get('Content-Length')
            if content_len_raw != None:
                post_body = self.rfile.read(int(content_len_raw))
                body = json.loads(post_body)

            for handler in RestApi.handlers:
                if handler.method == method and path.startswith(handler.path):
                    found = True
                    if handler.function != None:
                        response = handler.function(query=query, body=body)
                        if response == None:
                            self.send_response(201)
                            self.send_header("Access-Control-Allow-Origin", "*")
                            self.end_headers()
                        else:
                            self.send_response(200)
                            self.send_header("Content-type", "application/json")
                            self.send_header("Access-Control-Allow-Origin", "*")
                            self.end_headers()
                            self.wfile.write(bytes(json.dumps(response), "utf-8"))
                    else:
                        end_path = os.path.basename(path)
                        with open(handler.base_dir + sanitize_filename(file_name(end_path)) + "." + sanitize_filename(file_extension(end_path)), "rb") as f:
                            self.send_response(200)
                            self.send_header("Access-Control-Allow-Origin", "*")
                            self.end_headers()
                            self.wfile.write(f.read())
        


            if not found:
                self.send_response(404)
                self.end_headers()
        except Exception as e:
            print(str(e))
            pass
            
            
    def log_message(a, b, c, d, e):
        pass

    def do_GET(self):
        self.general_handler("GET")

    def do_POST(self):
        self.general_handler("POST")

class RestApi:
    def __init__(self):
        RestApi.handlers = []

    def post(self, path, function):
        handler = RequestHandler("POST", path, function)
        self.handlers.append(handler)
    
    def get(self, path, function):
        handler = RequestHandler("GET", path, function)
        RestApi.handlers.append(handler)

    def serve_files(self, path, base_path):
        handler = RequestHandler("GET", path, None)
        handler.set_base_dir(base_path)
        RestApi.handlers.append(handler)


    def listen(self, host, port):
        self.server = HTTPServer((host, port), BaseServer)
        print("Server started http://%s:%s" % (host, port))
        self.server.serve_forever()