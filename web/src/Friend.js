import { useEffect } from "react";
import { Outlet, useParams } from "react-router";
import "./index.css";

function Friend() {
  const { username } = useParams();

  useEffect(() => {
    const previousTitle = document.title;

    document.title = username;

    return () => {
      document.title = previousTitle;
    };
  }, [username]);

  return <Outlet />;
}

export default Friend;
