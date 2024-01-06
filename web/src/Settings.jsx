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
        <label htmlFor="bio">Bio</label>
        <input
          type="text"
          id="bio"
          placeholder="Bio"
          autoFocus
          maxLength={128}
          value={bio}
          onChange={(e) => setBio(e.target.value || "")}
        />
        <hr style={{ width: "100%" }} />
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
        <div className="checkbox-container">
          <input
            id="handshakeEnabled"
            type="checkbox"
            autoFocus
            checked={handshakeEnabled}
            onChange={(e) => setHandshakeEnabled((old) => !old)}
          />
          <label htmlFor="handshakeEnabled">
            {handshakeEnabled ? "Accepting handshakes" : "Ignoring handshakes"}
          </label>
        </div>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

export default Settings;
