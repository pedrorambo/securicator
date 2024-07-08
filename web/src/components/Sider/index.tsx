import { Link, useParams } from "react-router-dom";
import { useSecuricator } from "../../context/SecuricatorContext";

const COMPILED_COMMIT_ID = process.env.REACT_APP_COMMIT_ID || "dev";

export function Sider() {
  const { globalPublicKey, contacts, name, connected, showMenu, setShowMenu } =
    useSecuricator();
  const { publicKey } = useParams<any>();

  return (
    <>
      <button
        id="show-menu-button"
        className="btn btn-text"
        onClick={() => setShowMenu(true)}
      >
        Show menu
      </button>

      <aside className={showMenu ? "force-show-menu" : ""}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link to={`/name`} className="text-button">
            <h2 id="my-current-display-name">{name || globalPublicKey}</h2>
          </Link>
          <button
            className="close-menu-button"
            onClick={() => setShowMenu(false)}
          >
            x
          </button>
        </div>
        <hr />

        <div className="side-content">
          <ul className="contacts" id="friends">
            {contacts.map((c) => (
              <li
                key={c.publicKey}
                className={c.publicKey === publicKey ? "open" : ""}
              >
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

          <Link to="/contacts/new" className="btn btn-text">
            Add new contact
          </Link>
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
            <span className="text-muted" title={COMPILED_COMMIT_ID}>
              {COMPILED_COMMIT_ID.substring(0, 8)}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
