import { FC } from "react";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";

interface Props {}

export const Home: FC<Props> = () => {
  const { globalPrivateKey, globalPublicKey, isInitialized } = useSecuricator();

  if (!isInitialized) return <h1>Initializing...</h1>;

  return (
    <>
      <Sider />
    </>
  );
};
