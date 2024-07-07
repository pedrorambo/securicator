import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./App.css";
import { SecuricatorProvider } from "./context/SecuricatorContext";
import { Home } from "./pages/Home";
import { AddContact } from "./pages/AddContact";
import { Chat } from "./pages/Chat";
import { ChangeName } from "./pages/ChangeName";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/name",
      element: <ChangeName />,
    },
    {
      path: "/contacts/new",
      element: <AddContact />,
    },
    {
      path: "/contacts/:publicKey",
      element: <Chat />,
    },
  ]);

  return (
    <SecuricatorProvider>
      <RouterProvider router={router} />
    </SecuricatorProvider>
  );
}

export default App;
