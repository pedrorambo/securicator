import { FC } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";
import { useNavigate } from "react-router";

interface Props {}

export const SelectInitialization: FC<Props> = () => {
  const { initializeNewAccount } = useSecuricator();
  const navigate = useNavigate();

  return (
    <main>
      <TopMenu hideBackButton title="Securicator Startup" />
      <div className="startup-selection">
        <div>
          <h2>Create new account</h2>
          <p>
            Recommended if you don't have an account yet associated with another
            device.
          </p>
          <button className="btn" onClick={() => initializeNewAccount()}>
            Continue
          </button>
        </div>
        <div>
          <h2>Assign existing account</h2>
          <p>
            Recommended if you have an account associated with another device.
          </p>
          <button
            className="btn"
            onClick={() => {
              navigate("/assign-existing-account");
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
};
