import { FC } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { useNavigate } from "react-router";

interface Props {}

export const Home: FC<Props> = () => {
  const { isInitialized, hasConfiguredAccount } = useSecuricator();
  const navigate = useNavigate();

  if (isInitialized) {
    if (hasConfiguredAccount) {
      navigate("/chats");
    } else {
      navigate("/select-initialization");
    }
  }

  if (!isInitialized) return <h1>Initializing...</h1>;
  return null;
};
