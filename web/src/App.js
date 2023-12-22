import "./index.css";

function App() {
  return (
    <div className="main-container">
      <div className="friends-container">
        <div className="friends-list">
          <a href="#" className="friend">
            <div href="#" className="friend-horizontal">
              <div className="friend-status"></div>
              <div>
                <h3>username</h3>
                <p className="last-seen">3 seconds</p>
              </div>
            </div>
          </a>
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
