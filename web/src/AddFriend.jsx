import { useCallback, useState } from "react";
import "./index.css";
import { useNavigate } from "react-router";

function AddFriend() {
  const [username, setUsername] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();

  const onSend = useCallback(() => {
    fetch(`http://localhost:8000/add-friend`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }).then(() => {
      setUsername("");
      setShowConfirmation(true);
    });
  }, [username]);

  return (
    <div className="add-friend-container">
      {showConfirmation ? (
        <div className="add-friend-form">
          <h3>Friend request sent</h3>
          <p className="m-0">
            The contact will appear in your friend list if the pre-shared key is
            correct and the user is online. If it doesn't, you have the option
            to send another request.
          </p>

          <button
            type="button"
            onClick={() => {
              navigate("/");
              setShowConfirmation(false);
            }}
          >
            OK
          </button>
        </div>
      ) : (
        <form
          autoComplete="off"
          className="add-friend-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <div>
            <h3>Add friend</h3>
            <p>
              You can add friends with their username, provided both of you have
              the same pre-shared key.
            </p>
          </div>

          <div className="d-flex gap-1">
            <input
              type="text"
              maxLength={32}
              placeholder="Username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value || "")}
            />
            <button type="submit">Add friend</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddFriend;
