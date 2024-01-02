import { useState } from "react";
import { useNavigate } from "react-router";
import "./index.css";

function Settings() {
  const [acceptFriends, setAcceptFriends] = useState(false);
  const [bio, setBio] = useState("");
  const [secret, setSecret] = useState("");
  const navigate = useNavigate();

  // const onSend = useCallback(() => {
  //   fetch(`http://localhost:8000/add-friend`, {
  //     method: "POST",
  //     body: JSON.stringify({ username }),
  //   }).then(() => {
  //     setUsername("");
  //     setShowConfirmation(true);
  //   });
  // }, [username]);

  return (
    <div className="add-friend-container">
      <form
        className="add-friend-form"
        onSubmit={(e) => {
          e.preventDefault();
          // onSend();
        }}
      >
        <input
          type="checkbox"
          autoFocus
          checked={acceptFriends}
          onChange={(e) => setAcceptFriends((old) => !old)}
        />
        <label htmlFor="">
          {acceptFriends ? "Accepting handshakes" : "Ignoring handshakes"}
        </label>
        <input
          type="text"
          placeholder="Bio"
          autoFocus
          value={bio}
          onChange={(e) => setBio(e.target.value || "")}
        />
        <input
          type="password"
          placeholder="Secret"
          autoFocus
          value={secret}
          onChange={(e) => setSecret(e.target.value || "")}
        />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

export default Settings;
