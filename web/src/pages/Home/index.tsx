import { FC } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { useNavigate } from "react-router";

interface Props {}

export const Home: FC<Props> = () => {
  const { isInitialized } = useSecuricator();
  const navigate = useNavigate();

  if (isInitialized) {
    navigate("/chats");
  }

  if (!isInitialized) return <h1>Initializing...</h1>;
  return null;
};
