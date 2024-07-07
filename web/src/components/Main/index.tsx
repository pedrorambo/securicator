import React from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

export function Main() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <h1>Helo</h1>,
    },
  ]);

  return <RouterProvider router={router}></RouterProvider>;

  return (
    <main>
      <div className="chat-box">
        <div className="messages-box"></div>
        <form
          className="compose-box"
          // onsubmit="event.preventDefault(); onSendMessage()"
          // autocomplete="off"
        >
          <input
            name="message"
            id="message"
            placeholder="Text message"
            // maxlength="1024"
            // autoFocus="on"
          />
          <button className="btn btn-text">Submit</button>
        </form>
      </div>
    </main>
  );
}
