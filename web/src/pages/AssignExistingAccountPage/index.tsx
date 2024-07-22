import { FC, useState } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";
import { useNavigate } from "react-router";

interface Props {}

export const AssignExistingAccountPage: FC<Props> = () => {
  const { initializeExistingAccount } = useSecuricator();
  const navigate = useNavigate();
  const [value, setValue] = useState<string>("");
  const [bioValue, setBioValue] = useState<string>("");

  return (
    <main>
      <TopMenu hideBackButton title="Assign existing account" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value) {
            initializeExistingAccount(value);
          }
        }}
        className="generic-form"
      >
        <label htmlFor="private-key">Existing Synchronization Key</label>
        <input
          type="text"
          id="private-key"
          value={value}
          onChange={(e) => setValue(e.target.value || "")}
        />
        <button type="submit">Assign</button>
      </form>
    </main>
  );
};
