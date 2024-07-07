import {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { Event, db } from "../database/db";
import { asymmetricDecrypt } from "../utils/asymmetricDecrypt";
import { asymmetricEncrypt } from "../utils/asymmetricEncrypt";
import { generateKeypair } from "../utils/generateKeypair";
import { generateSymmetricKey } from "../utils/generateSymmetricKey";
import { symmetricDecrypt } from "../utils/symmetricDecrypt";
import { symmetricEncrypt } from "../utils/symmetricEncrypt";

async function initializeAccount() {
  const existingAccount = window.localStorage.getItem("securicator-account");
  if (existingAccount) {
    return JSON.parse(existingAccount);
  } else {
    const { privateKey, publicKey } = await generateKeypair();
    window.localStorage.setItem(
      "securicator-account",
      JSON.stringify({ privateKey, publicKey })
    );
    return { privateKey, publicKey, name: "", biography: "" };
  }
}

interface Props {
  globalPrivateKey?: string;
  globalPublicKey?: string;
  isInitialized?: boolean;
  addContact: (publicKey: string) => any;
  contacts: Contact[];
  sendMessage: (publicKey: string, message: string) => any;
  name: string;
  changeName: (name: string) => any;
  changeBiography: (name: string) => any;
  connected: boolean;
  biography: string;
}

export interface Contact {
  publicKey: string;
  displayName?: string;
  biography?: string;
  everBeenOnline: boolean;
}

const SecuricatorContext = createContext<Props>({} as Props);

export const SecuricatorProvider: FC<any> = ({ children }) => {
  const [globalPrivateKey, setGlobalPrivateKey] = useState<string>();
  const [globalPublicKey, setGlobalPublicKey] = useState<string>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState<string>("");
  const [biography, setBiography] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const websocket = useRef<WebSocket | null>(null);
  const [websocketReloadCount, setWebsocketReloadCount] = useState<number>(1);

  const isInitialized = useMemo(() => {
    return !!globalPrivateKey && !!globalPublicKey;
  }, [globalPrivateKey, globalPublicKey]);

  async function handleEnvelopeDelivered(
    publicKey: string,
    content: { id: string; deliveredAt: string }
  ) {
    const envelope = await db.envelopes.get({
      id: content.id,
    });
    if (!envelope) return;
    if (envelope.deliveredAt) return;
    await db.envelopes.update(
      {
        id: content.id,
      } as any,
      {
        deliveredAt: new Date(content.deliveredAt),
      }
    );
  }

  async function handleEventReceived(event: Event) {
    if (!globalPublicKey) return;
    console.log("EVENT RECEIVED: ", event.type);
    const count = await db.events.where("id").equals(event.id).count();
    if (count > 0) return;
    db.events.add(event);
    switch (event.type) {
      case "envelope":
        const envelope = JSON.parse(event.payload);
        envelope.createdAt = new Date(envelope.createdAt);
        envelope.deliveredAt = new Date();
        db.envelopes.add(envelope);
        const deliveredEvent: Event = {
          id: uuid(),
          createdAt: new Date(),
          fromPublicKey: globalPublicKey,
          toPublicKey: envelope.senderPublicKey,
          type: "envelope-delivered",
          payload: JSON.stringify({
            id: envelope.id,
            deliveredAt: envelope.deliveredAt.toISOString(),
          }),
        };
        db.events.add(deliveredEvent);
        await sendToContact(
          envelope.senderPublicKey,
          `EVENT ${JSON.stringify(deliveredEvent)}`
        );
        break;
      case "envelope-delivered":
        handleEnvelopeDelivered(event.fromPublicKey, JSON.parse(event.payload));
        break;
    }
  }

  async function handleSyncRequestReceived(
    publicKey: string,
    innerContent: string
  ) {
    const [count] = innerContent.split(" ");
    const localCount = await db.events
      .where("toPublicKey")
      .equals(publicKey)
      .count();
    console.log("SYNC", localCount, count);
    if (localCount > parseInt(count)) {
      const contactEvents = await db.events
        .where("toPublicKey")
        .equals(publicKey)
        .toArray();
      for (const event of contactEvents) {
        await sendToContact(publicKey, `EVENT ${JSON.stringify(event)}`);
      }
    }
  }

  async function handleContactInfoReceived(
    publicKey: string,
    innerContent: string
  ) {
    const info = JSON.parse(innerContent);
    const contact = contacts.find((c) => c.publicKey === publicKey);
    if (
      contact &&
      contact.displayName === info.name &&
      contact.biography === info.biography
    )
      return;
    if (info.name || info.biography) {
      setContacts((old) => {
        const newValue = old.map((c) => {
          if (c.publicKey !== publicKey) return c;
          return {
            ...c,
            displayName: info.name || "",
            biography: info.biography || "",
          };
        });
        window.localStorage.setItem(
          "securicator-contacts",
          JSON.stringify(newValue)
        );
        return newValue;
      });
    }
  }

  async function handleInnerMessage(publicKey: string, rawContent: string) {
    if (!globalPrivateKey || !globalPublicKey) return;
    const [encryptedSymmetricKey, iv, encrypted] = rawContent.split(" ");
    const symmetricKey = await asymmetricDecrypt(
      encryptedSymmetricKey,
      globalPrivateKey
    );
    const content = await symmetricDecrypt(encrypted, symmetricKey, iv);
    const [verb, ...rest] = content.split(" ");
    const innerContent = rest.join(" ");

    switch (verb) {
      case "EVENT":
        const event = JSON.parse(innerContent);
        event.createdAt = new Date(event.createdAt);
        handleEventReceived(event);
        break;
      case "SYNC_REQUEST":
        handleSyncRequestReceived(publicKey, innerContent);
        break;
      case "CONTACT_INFO":
        handleContactInfoReceived(publicKey, innerContent);
        break;
    }
  }

  useEffect(() => {
    if (!globalPublicKey || !globalPrivateKey) return;
    websocket.current = new WebSocket("ws://localhost:9090", "protocolOne");
    websocket.current.onmessage = async (event) => {
      const parts = event.data
        .trim()
        .split(" ")
        .map((part: string) => part.trim());
      const contactGlobalPublicKey = parts[0];
      const myGlobalPublicKey = parts[1];
      const verb = parts[2].replace(/gpk_/, "");
      const content = parts.slice(3).join(" ");

      if (verb === "CONTACT_MESSAGE") {
        handleInnerMessage(contactGlobalPublicKey, content);
      }
    };
    websocket.current.onopen = () => {
      websocket.current?.send(`CONNECT ${globalPublicKey}`);
      setConnected(true);
    };
    websocket.current.onerror = (e) => {
      setConnected(false);
      console.error("Socket errored", e);
      setTimeout(() => {
        setWebsocketReloadCount((old) => old + 1);
      }, Math.min(websocketReloadCount * 1000, 10000));
    };
    websocket.current.onclose = (e) => {
      setConnected(false);
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(() => {
        setWebsocketReloadCount((old) => old + 1);
      }, Math.min(websocketReloadCount * 1000, 10000));
    };

    const wsCurrent = websocket.current;

    return () => {
      wsCurrent.close();
    };
  }, [globalPublicKey, globalPrivateKey, websocketReloadCount]);

  useEffect(() => {
    initializeAccount().then((account) => {
      setGlobalPrivateKey(account.privateKey);
      setGlobalPublicKey(account.publicKey);
      setName(account.name);
      setBiography(account.biography);
    });
  }, []);

  useEffect(() => {
    const contacts = window.localStorage.getItem("securicator-contacts");
    if (contacts) {
      setContacts(JSON.parse(contacts));
    }
  }, []);

  const addContact = useCallback(
    (publicKey: string) => {
      if (contacts?.some((c) => c.publicKey === publicKey)) return;
      const updatedContacts = [
        ...(contacts || []),
        { publicKey, everBeenOnline: false },
      ];
      setContacts(updatedContacts);
      window.localStorage.setItem(
        "securicator-contacts",
        JSON.stringify(updatedContacts)
      );
    },
    [contacts]
  );

  const changeName = useCallback(
    (newName: string) => {
      setName(newName);
      window.localStorage.setItem(
        "securicator-account",
        JSON.stringify({
          privateKey: globalPrivateKey,
          publicKey: globalPublicKey,
          name: newName,
        })
      );
    },
    [globalPrivateKey, globalPublicKey]
  );

  const changeBiography = useCallback(
    (newValue: string) => {
      setBiography(newValue);
      window.localStorage.setItem(
        "securicator-account",
        JSON.stringify({
          privateKey: globalPrivateKey,
          publicKey: globalPublicKey,
          name: name,
          biography: newValue,
        })
      );
    },
    [globalPrivateKey, globalPublicKey, name]
  );

  const sendToContact = useCallback(
    async (publicKey: string, content: string) => {
      const symmetricKey = await generateSymmetricKey();
      const encryptedSymmetricKey = await asymmetricEncrypt(
        symmetricKey,
        publicKey
      );
      const encryptedContent = await symmetricEncrypt(content, symmetricKey);
      websocket.current?.send(
        `${globalPublicKey} ${publicKey} CONTACT_MESSAGE ${encryptedSymmetricKey} ${encryptedContent.iv} ${encryptedContent.encrypted}`
      );
    },
    [globalPublicKey]
  );

  const sendMessage = useCallback(
    (publicKey: string, message: string) => {
      if (!contacts?.some((c) => c.publicKey === publicKey)) return;
      if (!globalPublicKey) return;
      const envelope = {
        id: uuid(),
        content: message,
        senderPublicKey: globalPublicKey,
        receiverPublicKey: publicKey,
        createdAt: new Date(),
      };
      db.envelopes.add(envelope);
      const event = {
        id: uuid(),
        type: "envelope",
        fromPublicKey: globalPublicKey,
        toPublicKey: publicKey,
        createdAt: new Date(),
        payload: JSON.stringify(envelope),
      };
      db.events.add(event);
      sendToContact(publicKey, `EVENT ${JSON.stringify(event)}`);
    },
    [contacts, globalPublicKey, sendToContact]
  );

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      // FIXME Will cause problems when updating the contacts (receiving updates)
      for (const contact of contacts) {
        sendToContact(
          contact.publicKey,
          `HEARTBEAT ${new Date().toISOString()}`
        );
        sendToContact(
          contact.publicKey,
          `CONTACT_INFO ${JSON.stringify({
            name,
            biography,
          })}`
        );
        db.events
          .where("toPublicKey")
          .equals(contact.publicKey)
          .count()
          .then((response) => {
            sendToContact(
              contact.publicKey,
              `SYNC_REQUEST ${response} ${new Date().toISOString()}`
            );
          });
      }
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [connected, contacts, sendToContact, biography, name]);

  return (
    <SecuricatorContext.Provider
      value={{
        globalPrivateKey,
        globalPublicKey,
        isInitialized,
        addContact,
        contacts,
        sendMessage,
        name,
        changeName,
        connected,
        biography,
        changeBiography,
      }}
    >
      {children}
    </SecuricatorContext.Provider>
  );
};

export const useSecuricator = () => {
  return useContext(SecuricatorContext);
};
