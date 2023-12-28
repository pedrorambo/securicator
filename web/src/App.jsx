import { Outlet } from "react-router";
import "./index.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function App() {
  const [friends, setFriends] = useState([]);
  const [status, setStatus] = useState({});

  useEffect(() => {
    let requesting = false;
    const doRequest = () => {
      if (requesting) return;
      requesting = true;
      fetch("http://localhost:8000/friends")
        .then((res) => res.json())
        .then((data) => {
          setFriends(
            data.map((f) => {
              if (!f.lastHeartbeat) return f;
              const lastHeartbeat = new Date(f.lastHeartbeat);
              const now = new Date();
              const diff = now - lastHeartbeat;
              const differenceInSeconds = Math.floor(diff / 1000);
              return {
                ...f,
                differenceInSeconds,
                active: diff < 15000,
              };
            })
          );
        })
        .finally(() => (requesting = false));
    };

    doRequest();
    const interval = setInterval(doRequest, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let requesting = false;
    const doRequest = () => {
      if (requesting) return;
      requesting = true;
      fetch("http://localhost:8000/status")
        .then((res) => res.json())
        .then((data) => {
          setStatus(data);
        })
        .finally(() => (requesting = false));
    };

    doRequest();
    const interval = setInterval(doRequest, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-container">
      <div className="friends-container">
        <div className="friends-list">
          {!friends.length && (
            <p className="no-friends">You don't have any friends yet</p>
          )}
          {friends.map((f) => (
            <Link
              to={`/friends/${f.username}/chat`}
              className="friend"
              key={f.username}
            >
              <div className="friend-horizontal">
                <div
                  className={`friend-status ${f.active ? "online" : ""}`}
                ></div>
                <div>
                  <h3>{f.username}</h3>
                  {typeof f.differenceInSeconds === "number" && (
                    <p className="last-seen">
                      {f.differenceInSeconds}{" "}
                      {f.differenceInSeconds > 1 ? "seconds" : "second"}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bottom-container">
          <Link to={"/add-friend"} type="button" className="btn">
            Add friend
          </Link>
          <div
            className={`relay-status ${status.relayConnected ? "online" : ""}`}
          ></div>
        </div>
      </div>
      <div className="chat-container">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
