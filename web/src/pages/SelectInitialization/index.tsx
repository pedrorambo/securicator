import { FC } from "react";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";

interface Props {}

export const SelectInitialization: FC<Props> = () => {
  const { globalPrivateKey, globalPublicKey, isInitialized } = useSecuricator();

  return (
    <>
      <div>
        <button>
          <h2>Criar nova conta</h2>
        </button>
      </div>
      <div>
        <button>
          <h2>Importar conta existente</h2>
        </button>
      </div>
    </>
  );
};
