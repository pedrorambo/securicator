import { Outlet } from "react-router";
import "./index.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Add notification badge (pill) to favicon in browser tab
 * @url stackoverflow.com/questions/65719387/
 */
class Badger {
  constructor(options) {
    Object.assign(
      this,
      {
        backgroundColor: "#f00",
        color: "#fff",
        size: 1, // 0..1 (Scale in respect to the favicon image size)
        position: "ne", // Position inside favicon "n", "e", "s", "w", "ne", "nw", "se", "sw"
        radius: 8, // Border radius
        src: "", // Favicon source (dafaults to the <link> icon href)
        onChange() {},
      },
      options
    );
    this.canvas = document.createElement("canvas");
    this.src = this.src || this.faviconEL.getAttribute("href");
    this.ctx = this.canvas.getContext("2d");
  }

  faviconEL = document.querySelector("link[rel$=icon]");

  _drawIcon() {
    this.ctx.clearRect(0, 0, this.faviconSize, this.faviconSize);
    this.ctx.drawImage(this.img, 0, 0, this.faviconSize, this.faviconSize);
  }

  _drawShape() {
    const r = this.radius;
    const xa = this.offset.x;
    const ya = this.offset.y;
    const xb = this.offset.x + this.badgeSize;
    const yb = this.offset.y + this.badgeSize;
    this.ctx.beginPath();
    this.ctx.moveTo(xb - r, ya);
    this.ctx.quadraticCurveTo(xb, ya, xb, ya + r);
    this.ctx.lineTo(xb, yb - r);
    this.ctx.quadraticCurveTo(xb, yb, xb - r, yb);
    this.ctx.lineTo(xa + r, yb);
    this.ctx.quadraticCurveTo(xa, yb, xa, yb - r);
    this.ctx.lineTo(xa, ya + r);
    this.ctx.quadraticCurveTo(xa, ya, xa + r, ya);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
    this.ctx.closePath();
  }

  _drawVal() {
    const margin = (this.badgeSize * 0.18) / 2;
    this.ctx.beginPath();
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";
    this.ctx.font = `bold ${this.badgeSize * 0.82}px Arial`;
    this.ctx.fillStyle = this.color;
    this.ctx.fillText(
      this.value,
      this.badgeSize / 2 + this.offset.x,
      this.badgeSize / 2 + this.offset.y + margin
    );
    this.ctx.closePath();
  }

  _drawFavicon() {
    this.faviconEL.setAttribute("href", this.dataURL);
  }

  _draw() {
    this._drawIcon();
    if (this.value) this._drawShape();
    if (this.value) this._drawVal();
    this._drawFavicon();
  }

  _setup() {
    this.faviconSize = this.img.naturalWidth;
    this.badgeSize = this.faviconSize * this.size;
    this.canvas.width = this.faviconSize;
    this.canvas.height = this.faviconSize;
    const sd = this.faviconSize - this.badgeSize;
    const sd2 = sd / 2;
    this.offset = {
      n: { x: sd2, y: 0 },
      e: { x: sd, y: sd2 },
      s: { x: sd2, y: sd },
      w: { x: 0, y: sd2 },
      nw: { x: 0, y: 0 },
      ne: { x: sd, y: 0 },
      sw: { x: 0, y: sd },
      se: { x: sd, y: sd },
    }[this.position];
  }

  // Public functions / methods:

  update() {
    this._value = Math.min(99, parseInt(this._value, 10));
    if (this.img) {
      this._draw();
      if (this.onChange) this.onChange.call(this);
    } else {
      this.img = new Image();
      this.img.crossOrigin = "anonymous";
      this.img.addEventListener("load", () => {
        this._setup();
        this._draw();
        if (this.onChange) this.onChange.call(this);
      });
      this.img.src = this.src;
    }
  }

  get dataURL() {
    return this.canvas.toDataURL();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = val;
    this.update();
  }
}

const myBadgerOptions = {}; // See: constructor for customization options
const myBadger = new Badger(myBadgerOptions);

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

  useEffect(() => {
    if (status) {
      myBadger.value = status.unreadMessages || 0;
    }
  }, [status]);

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
          <div className="bottom-buttons">
            <Link to={"/add-friend"} type="button" className="btn">
              Add friend
            </Link>
            <Link to={"/settings"} type="button" className="btn">
              Settings
            </Link>
          </div>
          <div className="menu-indicators">
            <div
              className={`relay-status ${
                status.relayConnected ? "online" : ""
              }`}
              title={status.relayConnected ? "Connected" : "Disconnected"}
            ></div>
            {!!status.handshakeAllowed && (
              <div
                className={`handshake-allowed-indicator`}
                title="Accepting handshake"
              ></div>
            )}
          </div>
        </div>
      </div>
      <div className="chat-container">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
