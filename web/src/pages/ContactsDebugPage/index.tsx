import { FC } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";

interface Props {}

export const ContactsDebugPage: FC<Props> = () => {
  const { contacts } = useSecuricator();

  return (
    <main>
      <TopMenu title="Contacts" />
      <div style={{ overflow: "auto" }}>
        <ul className="unstyled-list">
          {contacts.map((e) => (
            <li key={e.publicKey}>
              <pre>{JSON.stringify(e, null, 2).substring(2).slice(0, -2)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};
