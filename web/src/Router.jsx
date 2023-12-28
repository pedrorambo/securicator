import { Route, Routes } from "react-router";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import Friend from "./Friend";
import Chat from "./Chat";
import AddFriend from "./AddFriend";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="add-friend" Component={AddFriend} />
          <Route path="friends/:username" element={<Friend />}>
            <Route path="chat" Component={Chat} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
