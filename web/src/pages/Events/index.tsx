import { FC, useEffect, useState } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";
import { db, Envelope, Event } from "../../database/db";

interface Props {}

export const Events: FC<Props> = () => {
  const { publicKeyToDisplayName } = useSecuricator();
  const [items, setItems] = useState<Event[]>([]);

  useEffect(() => {
    db.events.toArray().then((result) => {
      setItems(
        result
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((e) => {
            return {
              ...e,
              fromPublicKey: publicKeyToDisplayName(e.fromPublicKey),
              toPublicKey: publicKeyToDisplayName(e.toPublicKey),
              payload: JSON.parse(e.payload),
            };
          })
      );
    });
  }, [publicKeyToDisplayName]);

  return (
    <main>
      <TopMenu title="Events" />
      <div style={{ overflow: "auto" }}>
        <ul className="unstyled-list">
          {items.map((e) => (
            <li key={e.id}>
              <pre>{JSON.stringify(e, null, 2).substring(2).slice(0, -2)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};
