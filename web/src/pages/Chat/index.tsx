import { useLiveQuery } from "dexie-react-hooks";
import { FC, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";
import { db } from "../../database/db";

interface Props {}

export const Chat: FC<Props> = () => {
  const { publicKey: rawPublicKey } = useParams<{ publicKey: string }>();
  const { sendMessage, setShowMenu } = useSecuricator();
  const [message, setMessage] = useState<string>("");

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

  return (
    <>
      <Sider />
      <main>
        <div className="chat-box">
          <div className="messages-box">
            {contactMessages?.map((message) => (
              <div
                className={message.sent ? "sent" : "received"}
                key={message.id}
              >
                <div>
                  <p>{message.content}</p>
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
              autoFocus
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
