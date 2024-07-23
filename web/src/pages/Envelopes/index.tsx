import { FC, useEffect, useState } from "react";
import { useSecuricator } from "../../context/SecuricatorContext";
import { TopMenu } from "../TopMenu";
import { db, Envelope } from "../../database/db";

interface Props {}

export const Envelopes: FC<Props> = () => {
  const { publicKeyToDisplayName } = useSecuricator();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);

  useEffect(() => {
    db.envelopes.toArray().then((result) => {
      setEnvelopes(
        result
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((e) => ({
            ...e,
            senderPublicKey: publicKeyToDisplayName(e.senderPublicKey),
            receiverPublicKey: publicKeyToDisplayName(e.receiverPublicKey),
          }))
      );
    });
  }, [publicKeyToDisplayName]);

  return (
    <main>
      <TopMenu title="Envelopes" />
      <div style={{ overflow: "auto" }}>
        <ul className="unstyled-list">
          {envelopes.map((e) => (
            <li key={e.id}>
              <pre>{JSON.stringify(e, null, 2).substring(2).slice(0, -2)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};
