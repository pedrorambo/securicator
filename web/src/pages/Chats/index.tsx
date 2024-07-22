import { useLiveQuery } from "dexie-react-hooks";
import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";
import { db } from "../../database/db";
import { Message } from "./Message";
import { useWindowFocus } from "../../utils/useWindowFocus";
import { Link } from "react-router-dom";

interface Props {}

export const Chats: FC<Props> = () => {
  const { globalPublicKey, contacts, name, connected, showMenu, setShowMenu } =
    useSecuricator();
  const { publicKey } = useParams<any>();
  const navigate = useNavigate();

  return (
    <>
      <main>
        <h2>Contacts</h2>
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
      </main>
    </>
  );
};
