import { useLiveQuery } from "dexie-react-hooks";
import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";
import { db } from "../../database/db";
import { Message } from "./Message";
import { useWindowFocus } from "../../utils/useWindowFocus";
import leftIcon from "../../assets/left.svg";
import { TopMenu } from "../TopMenu";

interface Props {}

export const Chat: FC<Props> = () => {
  const { publicKey: rawPublicKey } = useParams<{ publicKey: string }>();
  const { sendMessage, setShowMenu, contacts, setContactRead, connected } =
    useSecuricator();
  const [message, setMessage] = useState<string>("");
  const navigate = useNavigate();

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

  return (
    <>
      <main>
        <TopMenu
          title={contactName}
          subtitle={<small className="contact-status">Unknown</small>}
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
