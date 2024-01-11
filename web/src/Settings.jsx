import { useCallback, useEffect, useState } from "react";
import "./index.css";

function Settings() {
  const [handshakeEnabled, setHandshakeEnabled] = useState(false);
  const [bio, setBio] = useState("");
  const [presharedKey, setPresharedKey] = useState("");

  useEffect(() => {
    fetch(`http://localhost:8000/settings`)
      .then((res) => res.json())
      .then((content) => {
        setBio(content.bio);
        setHandshakeEnabled(content.handshakeAllowed);
        setPresharedKey(content.preSharedKey);
      });
  }, []);

  const onSend = useCallback(() => {
    fetch(`http://localhost:8000/settings`, {
      method: "POST",
      body: JSON.stringify({
        bio,
        handshakeAllowed: handshakeEnabled,
        preSharedKey: presharedKey,
      }),
    }).then(() => {});
  }, [bio, presharedKey, handshakeEnabled]);

  return (
    <div className="add-friend-container">
      <form
        autoComplete="off"
        className="add-friend-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <h3>Settings</h3>
        <div>
          <label htmlFor="bio">
            About me (will be shown to all your friends)
          </label>
          <input
            type="text"
            id="bio"
            placeholder="About me"
            autoFocus
            maxLength={128}
            value={bio}
            onChange={(e) => setBio(e.target.value || "")}
          />
        </div>
        <hr style={{ width: "100%" }} />
        <div>
          <label htmlFor="secret">Pre-shared key</label>
          <input
            type="password"
            id="secret"
            placeholder="Secret"
            autoFocus
            maxLength={128}
            minLength={8}
            required
            value={presharedKey}
            onChange={(e) => setPresharedKey(e.target.value || "")}
          />
        </div>
        <div className="checkbox-container">
          <input
            id="handshakeEnabled"
            type="checkbox"
            autoFocus
            checked={handshakeEnabled}
            onChange={(e) => setHandshakeEnabled((old) => !old)}
          />
          <label htmlFor="handshakeEnabled">
            {handshakeEnabled
              ? "Accepting friend requests"
              : "Ignoring friend requests"}
          </label>
        </div>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

export default Settings;
