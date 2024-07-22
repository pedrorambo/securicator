import { FC, useEffect, useState } from "react";
import { Sider } from "../../components/Sider";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";

interface Props {}

export const ChangeName: FC<Props> = () => {
  const { name, changeName, biography, changeBiography } = useSecuricator();
  const [value, setValue] = useState<string>("");
  const [bioValue, setBioValue] = useState<string>("");

  useEffect(() => {
    if (name) {
      setValue(name);
    }
  }, [name]);

  useEffect(() => {
    if (biography) {
      setBioValue(biography);
    }
  }, [biography]);

  return (
    <>
      <main>
        <TopMenu title="Edit profile" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value) {
              changeName(value);
            }
            if (bioValue) {
              changeBiography(bioValue);
            }
          }}
          className="generic-form"
        >
          <label htmlFor="new-name">New name</label>
          <input
            type="text"
            id="new-name"
            value={value}
            onChange={(e) => setValue(e.target.value || "")}
          />
          <label htmlFor="bio">Biography</label>
          <input
            type="text"
            id="bio"
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value || "")}
          />
          <button type="submit">Submit</button>
        </form>
      </main>
    </>
  );
};
