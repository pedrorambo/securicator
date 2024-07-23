import { useLiveQuery } from "dexie-react-hooks";
import { FC, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useSecuricator } from "../../context/SecuricatorContext";
import { db } from "../../database/db";
import { Message } from "./Message";
import { useWindowFocus } from "../../utils/useWindowFocus";
import { TopMenu } from "../TopMenu";

interface Props {}

export const Chat: FC<Props> = () => {
  const { publicKey: rawPublicKey } = useParams<{ publicKey: string }>();
  const { sendMessage, contacts, setContactRead } = useSecuricator();
  const [message, setMessage] = useState<string>("");
  const [passedSeconds, setPassedSeconds] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPassedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const publicKey = useMemo(() => {
    if (!rawPublicKey) return rawPublicKey;
    return decodeURIComponent(rawPublicKey);
  }, [rawPublicKey]);

  const contactMessages = useLiveQuery(async () => {
    if (!publicKey) return;
    const sentMessages = await db.envelopes
      .where("receiverPublicKey")
      .equals(publicKey)
      .toArray();
    const receivedMessages = await db.envelopes
      .where("senderPublicKey")
      .equals(publicKey)
      .toArray();

    return [
      ...sentMessages.map((m) => ({ ...m, sent: true })),
      ...receivedMessages.map((m) => ({ ...m, sent: false })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [publicKey]);

  const pageIsFocused = useWindowFocus();

  useEffect(() => {
    if (!publicKey) return;
    if (!pageIsFocused) return;
    const hasUnreadMessages = contacts.find(
      (c) => c.publicKey === publicKey && c.unread
    );
    if (hasUnreadMessages) {
      setContactRead(publicKey);
    }
  }, [contacts, publicKey, setContactRead, pageIsFocused]);

  const contactName = useMemo(() => {
    return contacts.find((c) => c.publicKey === publicKey)?.displayName;
  }, [contacts, publicKey]);

  const contactStatus = useMemo(() => {
    if (passedSeconds) {
    }
    const lastSeen = contacts.find(
      (c) => c.publicKey === publicKey
    )?.lastSeenAt;
    if (!lastSeen) return "Unknown";
    const isOnline = new Date().getTime() - lastSeen.getTime() < 5000;
    if (isOnline) return "Online";
    const lastSeenDate = lastSeen.toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Last seen ${lastSeenDate}`;
  }, [contacts, publicKey, passedSeconds]);

  return (
    <>
      <main>
        <TopMenu
          title={contactName}
          subtitle={
            <>
              {contactStatus === "Online" ? (
                <small className="contact-status online">Online</small>
              ) : (
                <small className="contact-status">{contactStatus}</small>
              )}
            </>
          }
        />
        <div className="chat-box">
          <div className="messages-box">
            {contactMessages?.map((message) => (
              <div
                className={message.sent ? "sent" : "received"}
                key={message.id}
              >
                <div>
                  <Message>{message.content}</Message>
                  <span
                    className={`delivered
                      ${message.deliveredAt ? "" : "not-delivered"}
                      ${message.readAt ? "read" : ""}
                      `}
                  ></span>
                </div>
              </div>
            ))}
          </div>
          <form
            className="compose-box"
            onSubmit={(e) => {
              if (!publicKey) return;
              e.preventDefault();
              if (message) {
                sendMessage(publicKey, message);
                setMessage("");
              }
            }}
            autoComplete="off"
          >
            <input
              name="message"
              id="message"
              placeholder="Text message"
              maxLength={1024}
              value={message}
              onChange={(e) => setMessage(e.target.value || "")}
            />
            <button className="btn btn-text">Submit</button>
          </form>
        </div>
      </main>
    </>
  );
};
