import { FC, useState } from "react";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";

interface Props {}

export const AddContact: FC<Props> = () => {
  const { isInitialized, addContact } = useSecuricator();
  const [publicKey, setPublicKey] = useState<string>("");

  if (!isInitialized) return <h1>Initializing...</h1>;

  return (
    <>
      <Sider />
      <main>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addContact(publicKey);
          }}
          className="generic-form"
        >
          <label htmlFor="its-public-key">Public key</label>
          <input
            type="text"
            id="its-public-key"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value || "")}
          />
          <button type="submit">Submit</button>
        </form>
      </main>
    </>
  );
};
