import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { useParams } from "react-router";
import { DragDrop } from "./DragDrop";

const browserLanguage = navigator.language || navigator.userLanguage;

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
};

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
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(browserLanguage, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString(browserLanguage, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "2-digit",
  });
}

function Chat() {
  const { username } = useParams();
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [alreadyScrolled, setAlreadyScrolled] = useState(false);
  const [files, setFiles] = useState([]);
  const [lockScrollToEnd, setLockScrollToEnd] = useState(true);
  const chatHistoryRef = useRef();
  const [onFocus, setOnFocus] = useState(false);
  const [loadMore, setLoadMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reachedTopEnd, setReachedTopEnd] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    let requesting = false;
    const doRequest = () => {
      if (requesting) return;
      requesting = true;
      fetch("http://localhost:8000/friends")
        .then((res) => res.json())
        .then((data) => {
          setFriends(
            data.map((f) => {
              if (!f.lastHeartbeat) return f;
              const lastHeartbeat = new Date(f.lastHeartbeat);
              const now = new Date();
              const diff = now - lastHeartbeat;
              const differenceInSeconds = Math.floor(diff / 1000);
              return {
                ...f,
                differenceInSeconds,
                active: diff < 15000,
              };
            })
          );
        })
        .finally(() => (requesting = false));
    };

    doRequest();
    const interval = setInterval(doRequest, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onFocus = () => setOnFocus(true);
    const onBlur = () => setOnFocus(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    onFocus();
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (onFocus && messages && messages.length) {
      const unreadMessages = messages.filter(
        (m) => !m.readAt && m.direction === "received"
      );
      if (unreadMessages.length) {
        fetch(`http://localhost:8000/reads`, {
          method: "POST",
          body: JSON.stringify({
            ids: unreadMessages.map((m) => m.id),
          }),
        });
      }
    }
  }, [onFocus, messages]);

  const totalFileSize = useMemo(() => {
    if (!files.length) return 0;
    let total = 0;
    for (const file of files) {
      total += file.size;
    }
    return formatBytes(total);
  }, [files]);

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
          setMessages((old) => {
            const parsed = data.map((m) => {
              const indicatorVariant = m.readAt
                ? "read"
                : m.deliveredAt
                ? "delivered"
                : "registered";
              const isURL = isValidUrl(m.content);
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
                isURL,
              };
            });
            const newValues = [...old];
            for (const item of parsed) {
              const index = newValues.findIndex((m) => m.id === item.id);
              if (index === -1) {
                newValues.push(item);
              } else {
                newValues[index] = item;
              }
            }
            return newValues.sort((a, b) => a.createdAt - b.createdAt);
          });
        })
        .finally(() => (requesting = false));
    };

    doRequest();
    const interval = setInterval(doRequest, 1000);
    return () => clearInterval(interval);
  }, [username]);

  const oldestMessageId = useMemo(() => {
    if (messages && messages.length) {
      return messages[0].id;
    } else {
      return null;
    }
  }, [messages]);

  useEffect(() => {
    document.onpaste = function (event) {
      const data = event.clipboardData || event.originalEvent.clipboardData;
      const items = data.items;

      for (const index in items) {
        var item = items[index];
        console.log(item);
        if (
          item.kind === "file" &&
          ["image/jpeg", "image/png"].includes(item.type)
        ) {
          const extension = item.type.includes("png") ? "png" : "jpg";
          event.preventDefault();
          var blob = item.getAsFile();
          var reader = new FileReader();
          reader.onload = function (event) {
            const uriIndex = event.target.result.indexOf(";base64,");
            const base64 = event.target.result.slice(uriIndex + 8);
            setFiles((old) => [
              ...old,
              {
                name: `Image_${index + 1}.${extension}`,
                size: base64.length,
                base64,
              },
            ]);
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    return () => {
      document.onpaste = null;
    };
  }, []);

  useEffect(() => {
    if (alreadyScrolled) return;
    if (messages.length) {
      setAlreadyScrolled(true);
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, alreadyScrolled]);

  const onSend = useCallback(async () => {
    if (files.length) {
      for (const file of files) {
        const content = file.base64 || (await getBase64(file));
        await fetch(`http://localhost:8000/messages`, {
          method: "POST",
          body: JSON.stringify({
            type: "file",
            contentInBase64: content,
            filename: file.name,
            username,
          }),
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

  useEffect(() => {
    const fn = (e) => {
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onSend();
      }
    };
    document.addEventListener("keypress", fn);
    return () => document.removeEventListener("keypress", fn);
  }, [onSend]);

  useEffect(() => {
    if (lockScrollToEnd) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [lockScrollToEnd, messages]);

  useEffect(() => {
    if (isLoadingMore || reachedTopEnd) return;
    if (oldestMessageId && loadMore) {
      setIsLoadingMore(true);
      fetch(
        `http://localhost:8000/messages?username=${encodeURIComponent(
          username
        )}&before=${oldestMessageId}`
      )
        .then((res) => res.json())
        .then((data) => {
          setMessages((old) => {
            const parsed = data.map((m) => {
              const indicatorVariant = m.readAt
                ? "read"
                : m.deliveredAt
                ? "delivered"
                : "registered";
              const direction =
                m.senderUsername === username ? "received" : "sent";
              const isURL = isValidUrl(m.content);
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
                isURL,
              };
            });
            const newValues = [...old];
            for (const item of parsed) {
              const index = newValues.findIndex((m) => m.id === item.id);
              if (index === -1) {
                newValues.push(item);
              } else {
                newValues[index] = item;
              }
            }
            return newValues.sort((a, b) => a.createdAt - b.createdAt);
          });
          setLoadMore(false);
          if (data.length === 0) setReachedTopEnd(true);
        })
        .finally(() => setIsLoadingMore(false));
    }
  }, [loadMore, oldestMessageId, username, isLoadingMore, reachedTopEnd]);

  return (
    <div className="chat-container">
      <div className="chat-topbar">
        <h3>{username}</h3>
        <p
          title={friends?.find((f) => f.username === username)?.bio || ""}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {friends?.find((f) => f.username === username)?.bio || ""}
        </p>
      </div>
      <div
        className="chat-history"
        ref={chatHistoryRef}
        onScroll={(e) => {
          const isTop = e.currentTarget.scrollTop <= 1000;
          if (isTop) setLoadMore(true);
          const isEnd =
            Math.abs(
              e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight
            ) < 10;
          setLockScrollToEnd(isEnd);
        }}
      >
        {!messages.length && (
          <p className="no-messages">
            No messages yet. Send one to start the conversation.
          </p>
        )}
        {messages.map((m) => (
          <div
            className={`message-container message-container-${m.direction} ${
              m.showPreviewImage ? "image-message" : ""
            }`}
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
                      m.deliveredAt ? "" : "message-muted"
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
                    {!m.showPreviewImage && m.fileName}
                  </p>
                </a>
              ) : (
                <>
                  {m.isURL ? (
                    <a target="_blank" href={m.content} rel="noreferrer">
                      <p
                        className={`message-content ${
                          m.deliveredAt ? "" : "message-muted"
                        }`}
                      >
                        {m.content}
                      </p>
                    </a>
                  ) : (
                    <p
                      className={`message-content ${
                        m.deliveredAt ? "" : "message-muted"
                      }`}
                    >
                      {m.content}
                    </p>
                  )}
                </>
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
          autoComplete="off"
          className="chat-send-container"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          {files.length ? (
            <>
              <button type="button" onClick={() => setFiles([])}>
                X
              </button>
              <p className="files-selected-label">
                {files.length} {files.length === 1 ? "file" : "files"} selected{" "}
                {files.length > 0 && <> - {totalFileSize}</>}
              </p>
            </>
          ) : (
            <textarea
              maxLength={65536}
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
