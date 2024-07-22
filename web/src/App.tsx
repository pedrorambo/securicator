import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./App.css";
import { SecuricatorProvider } from "./context/SecuricatorContext";
import { Home } from "./pages/Home";
import { AddContact } from "./pages/AddContact";
import { Chat } from "./pages/Chat";
import { ChangeName } from "./pages/ChangeName";
import { useEffect } from "react";
import { SelectInitialization } from "./pages/SelectInitialization";
import { Chats } from "./pages/Chats";
import { AssignExistingAccountPage } from "./pages/AssignExistingAccountPage";

const COMPILED_COMMIT_ID = process.env.REACT_APP_COMMIT_ID?.trim();

function App() {
  useEffect(() => {
    const interval = setInterval(() => {
      const url = `${window.location.origin}/version.txt`;
      fetch(url, {
        cache: "no-cache",
      }).then((response) => {
        response.text().then((response) => {
          const latestCommitId = response.trim();
          if (
            latestCommitId.length === 40 &&
            COMPILED_COMMIT_ID?.length === 40
          ) {
            if (latestCommitId !== COMPILED_COMMIT_ID) {
              window.location.reload();
            }
          }
        });
      });
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/select-initialization",
      element: <SelectInitialization />,
    },
    {
      path: "/assign-existing-account",
      element: <AssignExistingAccountPage />,
    },
    {
      path: "/name",
      element: <ChangeName />,
    },
    {
      path: "/chats",
      element: <Chats />,
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
