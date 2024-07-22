import { useLiveQuery } from "dexie-react-hooks";
import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useSecuricator } from "../../context/SecuricatorContext";
import { Link } from "react-router-dom";
import { TopMenu } from "../TopMenu";

const COMPILED_COMMIT_ID = process.env.REACT_APP_COMMIT_ID || "dev";

interface Props {}

export const Chats: FC<Props> = () => {
  const { globalPublicKey, contacts, name, connected, showMenu, setShowMenu } =
    useSecuricator();
  const { publicKey } = useParams<any>();
  const navigate = useNavigate();

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
                  {/* <div className="connected"></div>{" "} */}
                  {c.displayName || c.publicKey}
                </h3>
                <span>{c.biography}</span>
              </Link>
            </li>
          ))}
        </ul>

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
          Copy public key
        </button>
        <span className="text-muted version" title={COMPILED_COMMIT_ID}>
          {COMPILED_COMMIT_ID.substring(0, 8)}
        </span>
      </main>
    </>
  );
};
