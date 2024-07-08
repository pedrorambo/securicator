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
        <div className="conn-status" id="conn-status">
          {connected ? (
            <div className="connected"></div>
          ) : (
            <div className="disconnected"></div>
          )}
        </div>
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
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 512 512"
              height="200px"
              width="200px"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="m289.94 256 95-95A24 24 0 0 0 351 127l-95 95-95-95a24 24 0 0 0-34 34l95 95-95 95a24 24 0 1 0 34 34l95-95 95 95a24 24 0 0 0 34-34z"></path>
            </svg>
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
