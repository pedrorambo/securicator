import { Link } from "react-router-dom";
import { useSecuricator } from "../../context/SecuricatorContext";

export function Sider() {
  const { globalPublicKey, contacts, name, connected } = useSecuricator();

  return (
    <aside>
      <Link to={`/name`} className="text-button">
        <h2 id="my-current-display-name">{name || globalPublicKey}</h2>
      </Link>
      <hr />

      <div className="side-content">
        <ul className="contacts" id="friends">
          {contacts.map((c) => (
            <li key={c.publicKey}>
              <Link to={`/contacts/${encodeURIComponent(c.publicKey)}`}>
                <h3 className="unread">
                  <div className="connected"></div>{" "}
                  {c.displayName || c.publicKey}
                </h3>
                <span>10/10/1010</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link to="/contacts/new">Add new contact</Link>
      </div>

      <div className="side-footer">
        <div className="utility">
          <div className="conn-status" id="conn-status">
            {connected ? (
              <div className="connected"></div>
            ) : (
              <div className="disconnected"></div>
            )}
          </div>
          <button
            className="btn btn-text"
            onClick={() => {
              navigator.clipboard.writeText(globalPublicKey || "");
            }}
          >
            Copy public key
          </button>
        </div>
      </div>
    </aside>
  );
}
