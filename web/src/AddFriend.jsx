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
          <p>
            Handshake requested. If the pre-shared key is correct, and the user
            is running the application, soon the process will be complete. If
            not, you can send another request.
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
          className="add-friend-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input
            type="text"
            placeholder="Username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value || "")}
          />
          <button type="submit">Add friend</button>
        </form>
      )}
    </div>
  );
}

export default AddFriend;
