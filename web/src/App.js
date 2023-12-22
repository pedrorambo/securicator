import "./index.css";
import { useState, useEffect } from "react";

function App() {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5000/friends")
        .then((res) => res.json())
        .then((data) => {
          setFriends(
            data.map((f) => {
              if(!f.lastHeartbeat) return f
              const lastHeartbeat = new Date(f.lastHeartbeat);
              const now = new Date();
              const diff = now - lastHeartbeat;
              const differenceInSeconds = Math.floor(diff / 1000)
              return {
                ...f,
                differenceInSeconds,
                active: diff < 15000
              };
            })
          );
        });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-container">
      <div className="friends-container">
        <div className="friends-list">
          {friends.map((f) => (
            <a href="#" className="friend" key={f.username}>
              <div href="#" className="friend-horizontal">
                <div className={`friend-status ${f.active ? "online" : ""}`}></div>
                <div>
                  <h3>{f.username}</h3>
                  {typeof f.differenceInSeconds === 'number' && (
                    <p className="last-seen">{f.differenceInSeconds} {f.differenceInSeconds > 1 ? "seconds" : "second"}</p> 
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>

        <a href="#" type="button" className="btn">
          Add friend
        </a>
      </div>
      <div className="chat-container"></div>
    </div>
  );
}

export default App;
