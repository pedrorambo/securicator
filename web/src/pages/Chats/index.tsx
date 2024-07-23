import { FC, useEffect, useState } from "react";
import { useParams } from "react-router";
import { useSecuricator } from "../../context/SecuricatorContext";
import { Link } from "react-router-dom";
import { TopMenu } from "../TopMenu";

const COMPILED_COMMIT_ID = process.env.REACT_APP_COMMIT_ID || "dev";

interface Props {}

export const Chats: FC<Props> = () => {
  const { globalPublicKey, contacts, synchronizationKey } = useSecuricator();
  const { publicKey } = useParams<any>();
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSynchronization, setCopiedSynchronization] =
    useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copied]);

  useEffect(() => {
    if (copiedSynchronization) {
      const timeout = setTimeout(() => {
        setCopiedSynchronization(false);
      }, 2000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copiedSynchronization]);

  return (
    <>
      <main>
        <TopMenu hideBackButton title="Chats" />
        <ul className="contacts" id="friends">
          {contacts.map((c) => (
            <li
              key={c.publicKey}
              className={c.publicKey === publicKey ? "open" : ""}
            >
              <Link to={`/contacts/${encodeURIComponent(c.publicKey)}`}>
                <h3 className={c.unread ? "unread" : ""}>
                  {c.lastSeenAt &&
                  now.getTime() - c.lastSeenAt.getTime() < 1000 * 5 ? (
                    <div className="connected"></div>
                  ) : (
                    <div className="disconnected"></div>
                  )}{" "}
                  {c.displayName || c.publicKey}
                </h3>
                <span>{c.biography}</span>
              </Link>
            </li>
          ))}
        </ul>

        <hr />

        <h3>Options</h3>

        <Link to="/contacts/new" className="btn btn-text">
          Add new contact
        </Link>
        <Link to="/name" className="btn btn-text">
          Edit profile
        </Link>
        <button
          className="btn btn-text"
          onClick={() => {
            navigator.clipboard
              .writeText(globalPublicKey || "")
              .then(() => {
                setCopied(true);
              })
              .catch(console.error);
            if (navigator.share) {
              navigator
                .share({
                  text: globalPublicKey || "",
                })
                .catch(console.error);
            }
          }}
        >
          {copied ? "Copied" : "Copy public key"}
        </button>

        <hr />

        <h3>Sensitive actions</h3>

        <button
          className="btn btn-text btn-text-danger"
          onClick={() => {
            const response = window.confirm(
              "Are you sure you want to copy or share the synchronization key? Any person with the key can access your account."
            );
            if (response) {
              navigator.clipboard
                .writeText(synchronizationKey || "")
                .then(() => {
                  setCopiedSynchronization(true);
                })
                .catch(console.error);
              if (navigator.share) {
                navigator
                  .share({
                    text: synchronizationKey || "",
                  })
                  .catch(console.error);
              }
            }
          }}
        >
          {copiedSynchronization ? "Copied" : "Copy synchronization key"}
        </button>

        <button
          className="btn btn-text btn-text-danger"
          onClick={() => {
            const response = window.confirm(
              "Are you sure you want to delete everything?"
            );
            if (response) {
              const response2 = window.confirm(
                "Are you really sure you want to delete everything?"
              );
              if (response2) {
                window.localStorage.clear();
                window.indexedDB
                  .databases()
                  .then((r) => {
                    for (var i = 0; i < r.length; i++)
                      // @ts-ignore
                      window.indexedDB.deleteDatabase(r[i].name);
                  })
                  .then(() => {
                    window.location.replace("/");
                  });
              }
            }
          }}
        >
          Delete everything
        </button>

        <hr />

        <h3>Debug tools</h3>

        <Link to="/envelopes" className="btn btn-text">
          Envelopes
        </Link>

        <Link to="/events" className="btn btn-text">
          Events
        </Link>

        <Link to="/contacts" className="btn btn-text">
          Contacts
        </Link>

        <span className="text-muted version" title={COMPILED_COMMIT_ID}>
          Version:{" "}
          <pre style={{ display: "inline" }}>
            {COMPILED_COMMIT_ID.substring(0, 8)}
          </pre>
        </span>
      </main>
    </>
  );
};
