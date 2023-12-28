import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";
import { useParams } from "react-router";
import { DragDrop } from "./DragDrop";

async function getBase64(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      const result = reader.result;
      if (result.includes(";base64,")) {
        resolve(reader.result.split(";base64,")[1]);
      } else {
        resolve(reader.result);
      }
    };
    reader.onerror = function (error) {
      reject("Error: ", error);
    };
  });
}

function formatMessageDate(d) {
  const now = new Date();
  const date = new Date(Number(d));

  const differenceInSeconds = (now.getTime() - date.getTime()) / 1000;
  const differenceInMinutes = Math.floor(differenceInSeconds / 60);
  const differenceInHours = Math.floor(differenceInSeconds / 60 / 60);
  if (differenceInSeconds < 60) return "now";
  if (differenceInMinutes < 60) return `${differenceInMinutes}m`;
  if (differenceInHours < 24) return `${differenceInHours}h`;
  return date.toLocaleString();
}

function Chat() {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [alreadyScrolled, setAlreadyScrolled] = useState(false);
  const [files, setFiles] = useState([]);
  const chatHistoryRef = useRef();

  useEffect(() => {
    let requesting = false;
    const doRequest = () => {
      if (requesting) return;
      requesting = true;
      fetch(
        `http://localhost:8000/messages?username=${encodeURIComponent(
          username
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          setMessages(
            data.map((m) => {
              const indicatorVariant = m.readAt
                ? "read"
                : m.deliveredAt
                ? "delivered"
                : "registered";
              const direction =
                m.senderUsername === username ? "received" : "sent";
              const fileExtension = m.fileName
                ? m.fileName.split(".").pop()
                : null;
              const showPreviewImage = fileExtension
                ? ["png", "jpg", "jpeg", "webp", "gif"].includes(fileExtension)
                : null;
              return {
                ...m,
                indicatorVariant,
                direction,
                fileExtension,
                showPreviewImage,
              };
            })
          );
        })
        .finally(() => (requesting = false));
    };

    doRequest();
    const interval = setInterval(doRequest, 1000);
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    if (alreadyScrolled) return;
    if (messages.length) {
      setAlreadyScrolled(true);
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, alreadyScrolled]);

  const onSend = useCallback(() => {
    if (files.length) {
      for (const file of files) {
        getBase64(file).then((content) => {
          fetch(`http://localhost:8000/messages`, {
            method: "POST",
            body: JSON.stringify({
              type: "file",
              contentInBase64: content,
              filename: file.name,
              username,
            }),
          });
        });
      }
      setFiles([]);
    } else {
      const message = messageContent.trim();
      if (message.length) {
        fetch(`http://localhost:8000/messages`, {
          method: "POST",
          body: JSON.stringify({
            message: messageContent.trim(),
            username,
            type: "text:small",
          }),
        }).then(() => {
          setMessageContent("");
        });
      }
    }
  }, [messageContent, username, files]);

  return (
    <div className="chat-container">
      <div className="chat-history" ref={chatHistoryRef}>
        {!messages.length && (
          <p className="no-messages">
            No messages yet. Send one to start the conversation.
          </p>
        )}
        {messages.map((m) => (
          <div
            className={`message-container message-container-${m.direction}`}
            key={m.id}
          >
            <div>
              {m.fileName ? (
                <a
                  target="_blank"
                  href={`http://localhost:8000/media/${m.id}.${m.fileExtension}`}
                  rel="noreferrer"
                >
                  <p
                    className={`message-content ${
                      m.readAt ? "" : "message-muted"
                    }`}
                  >
                    {m.showPreviewImage && (
                      <>
                        <img
                          className="image-preview"
                          src={`http://localhost:8000/media/${m.id}.${m.fileExtension}`}
                          alt=""
                        />
                        <br />
                      </>
                    )}
                    {m.fileName}
                  </p>
                </a>
              ) : (
                <p
                  className={`message-content ${
                    m.readAt ? "" : "message-muted"
                  }`}
                >
                  {m.content}
                </p>
              )}
              <p className="message-timestamp">
                {formatMessageDate(m.createdAt)}
                {m.direction === "sent" && (
                  <span
                    className={`message-indicator message-indicator-${m.indicatorVariant}`}
                  ></span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      <DragDrop
        onUpload={(files) => {
          setFiles(files);
        }}
      >
        <form
          className="chat-send-container"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          {files.length ? (
            <p>
              {files.length} {files.length === 1 ? "file" : "files"}
            </p>
          ) : (
            <textarea
              autoFocus
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value || "")}
            />
          )}
          <button type="submit">Send</button>
        </form>
      </DragDrop>
    </div>
  );
}

export default Chat;
