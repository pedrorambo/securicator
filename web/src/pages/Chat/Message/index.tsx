import { useLiveQuery } from "dexie-react-hooks";
import { FC, useMemo, useState } from "react";
import { useParams } from "react-router";

interface Props {
  children: string;
}

export const Message: FC<Props> = ({ children }) => {
  const parts = useMemo(() => {
    return children.split(" ");
  }, [children]);

  return (
    <p>
      {parts.map((p) => {
        if (p.startsWith("http") || p.startsWith("https")) {
          return (
            <>
              <a href={p} target="blank" rel="noreferrer">
                {p}
              </a>{" "}
            </>
          );
        }
        return <span>{p} </span>;
      })}
    </p>
  );
};
