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

function getSynchronizationId() {
  const existing = window.localStorage.getItem(
    "securicator-synchronization-id"
  );
  if (existing) {
    return existing;
  } else {
    const newId = uuid();
    window.localStorage.setItem("securicator-synchronization-id", newId);
    return newId;
  }
}

function setNotificationIcon() {
  var link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    // @ts-ignore
    link.rel = "icon";
    document.head.appendChild(link);
  }
  // @ts-ignore
  link.href = "/bell.ico";
}

function removeNotificationIcon() {
  var link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    // @ts-ignore
    link.rel = "icon";
    document.head.appendChild(link);
  }
  // @ts-ignore
  link.href = "/favicon.ico";
}

async function initializeAccount() {
  const existingAccount = window.localStorage.getItem("securicator-account");
  if (existingAccount) {
    return JSON.parse(existingAccount);
  } else {
    return null;
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
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  setContactRead: (publicKey: string) => void;
  hasConfiguredAccount: boolean;
  initializeNewAccount: () => void;
  initializeExistingAccount: (synchronizationKey: string) => void;
  synchronizationKey?: string;
}

export interface Contact {
  publicKey: string;
  displayName?: string;
  biography?: string;
  everBeenOnline: boolean;
  unread?: boolean;
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
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [hasConfiguredAccount, setHasConfiguredAccount] =
    useState<boolean>(false);
  const [lastResendUnackedMessagesAt, setLastResendUnackedMessagesAt] =
    useState<number>();

  const initializeNewAccount = useCallback(async () => {
    const { privateKey, publicKey } = await generateKeypair();
    window.localStorage.setItem(
      "securicator-account",
      JSON.stringify({ privateKey, publicKey })
    );
    window.location.replace("/");
  }, []);

  const initializeExistingAccount = useCallback(
    async (synchronizationKey: string) => {
      const [privateKey, publicKey] = synchronizationKey.split(" ");
      window.localStorage.setItem(
        "securicator-account",
        JSON.stringify({ privateKey, publicKey })
      );
      window.location.replace("/");
    },
    []
  );

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

  const setContactRead = useCallback((publicKey: string) => {
    setContacts((old) =>
      old.map((contact) => ({
        ...contact,
        unread: contact.publicKey === publicKey ? false : contact.unread,
      }))
    );
  }, []);

  async function sendEventsAfter(date: Date) {
    if (!globalPublicKey) return;
    const events = await db.events
      .where("createdAt")
      .aboveOrEqual(date)
      .toArray();
    console.log(events);
    for (const event of events) {
      console.log("SENDING EVENT ", event.type);
      await sendToContact(
        globalPublicKey,
        0,
        `EVENT ${JSON.stringify({
          ...event,
          isSyncEvent: true,
        })}`
      );
    }
  }

  async function handleEventReceived(event: Event & { isSyncEvent?: boolean }) {
    if (!globalPublicKey) return;
    const count = await db.events.where("id").equals(event.id).count();
    const now = new Date();

    const isSyncEvent = !!event.isSyncEvent;

    if (!isSyncEvent) {
      if (count > 0) {
        await sendToContact(
          event.fromPublicKey,
          1,
          `ACK_EVENT ${JSON.stringify({
            id: event.id,
            acknowledged: true,
          })}`
        );
        return;
      } else {
        await sendToContact(
          event.fromPublicKey,
          1,
          `ACK_EVENT ${JSON.stringify({
            id: event.id,
            acknowledged: true,
          })}`
        );
      }
    }

    switch (event.type) {
      case "envelope":
        const envelope = JSON.parse(event.payload);
        const envelopeExists = await db.envelopes
          .where("id")
          .equals(envelope.id)
          .count();
        if (envelopeExists <= 0) {
          envelope.createdAt = new Date(envelope.createdAt);
          if (!isSyncEvent) {
            envelope.deliveredAt = new Date();
          }
          setContacts((old) =>
            old.map((contact) => ({
              ...contact,
              unread:
                contact.publicKey === envelope.senderPublicKey
                  ? true
                  : contact.unread || false,
            }))
          );
          db.envelopes.add(envelope);
        }
        if (!isSyncEvent) {
          const deliveredEvent: Event = {
            id: uuid(),
            createdAt: new Date(),
            fromPublicKey: globalPublicKey,
            toPublicKey: envelope.senderPublicKey,
            type: "envelope-delivered",
            acknowledged: false,
            payload: JSON.stringify({
              id: envelope.id,
              deliveredAt: envelope.deliveredAt.toISOString(),
            }),
          };
          db.events.add(deliveredEvent);
          await sendToContact(
            envelope.senderPublicKey,
            1,
            `EVENT ${JSON.stringify(deliveredEvent)}`
          );
        }
        break;
      case "contact":
        const content = JSON.parse(event.payload);
        addContact(content.publicKey, true);
        break;
      case "envelope-delivered":
        handleEnvelopeDelivered(event.fromPublicKey, JSON.parse(event.payload));
        break;
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

  function getSynchronizations() {
    const savedContent = window.localStorage.getItem(
      "securicator-synchronizations"
    );
    return savedContent
      ? JSON.parse(savedContent).map((item: any) => ({
          ...item,
          time: new Date(item.time),
        }))
      : [];
  }

  function updateSynchronization(id: string, time: Date) {
    const current = getSynchronizations();
    const existing = current.find((s: any) => s.id === id);
    if (existing) {
      existing.time = time.toISOString();
      window.localStorage.setItem(
        "securicator-synchronizations",
        JSON.stringify(current)
      );
    } else {
      current.push({ id, time });
      window.localStorage.setItem(
        "securicator-synchronizations",
        JSON.stringify(current)
      );
    }
  }

  function getLastSentSynchronizationTime(synchronizationId: string) {
    const synchronizations = getSynchronizations();
    const found = synchronizations.find((s: any) => s.id === synchronizationId);
    if (found) {
      return found.time;
    } else {
      return new Date("1970-01-01");
    }
  }

  async function handleSameContactSync(innerContent: string) {
    const synchronizationTime = new Date();
    const { synchronizationId } = JSON.parse(innerContent);
    const lastSynchronization =
      getLastSentSynchronizationTime(synchronizationId);
    if (new Date().getTime() - lastSynchronization.getTime() > 1000 * 5) {
      sendEventsAfter(lastSynchronization);
      updateSynchronization(synchronizationId, synchronizationTime);
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
      case "ACK_EVENT":
        const content = JSON.parse(innerContent);
        await db.events.update(content.id, {
          acknowledged: true,
        });
        break;
      case "CONTACT_INFO":
        handleContactInfoReceived(publicKey, innerContent);
        break;
      case "HEARTBEAT":
        sendUnackedEvents(publicKey);
        break;
      case "SAME_CONTACT_SYNC":
        handleSameContactSync(innerContent);
        break;
    }
  }

  useEffect(() => {
    if (!globalPublicKey || !globalPrivateKey) return;
    websocket.current = new WebSocket(
      process.env.REACT_APP_WEBSOCKET_URL || "ws://localhost:9093",
      "protocolOne"
    );
    websocket.current.onmessage = async (event) => {
      const parts = event.data
        .trim()
        .split(" ")
        .map((part: string) => part.trim());
      const contactGlobalPublicKey = parts[0];
      const myGlobalPublicKey = parts[1];
      const verb = parts[3].replace(/gpk_/, "");
      const content = parts.slice(4).join(" ");

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
      if (!account) {
        setHasConfiguredAccount(false);
        setInitialized(true);
        return;
      }
      setGlobalPrivateKey(account.privateKey);
      setGlobalPublicKey(account.publicKey);
      setName(account.name);
      setBiography(account.biography);
      setHasConfiguredAccount(true);
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!globalPublicKey) return;
    const contacts = window.localStorage.getItem("securicator-contacts");
    if (contacts) {
      let savedContacts = JSON.parse(contacts) || [];
      // MIGRATION
      if (savedContacts.length) {
        savedContacts = savedContacts.map((contact: any) => {
          if (!contact.hasAddedEvent) {
            contact.hasAddedEvent = true;
            const event = {
              id: uuid(),
              type: "contact",
              fromPublicKey: globalPublicKey,
              toPublicKey: globalPublicKey,
              createdAt: new Date(),
              payload: JSON.stringify(contact),
              acknowledged: true,
            };
            db.events.add(event);
          }
          return contact;
        });
        window.localStorage.setItem(
          "securicator-contacts",
          JSON.stringify(savedContacts)
        );
      }
      // END MIGRATION
      setContacts(savedContacts);
    }
  }, [globalPublicKey]);

  const addContact = useCallback(
    (publicKey: string, dontCreateEvent?: boolean) => {
      if (!globalPublicKey) return;
      if (contacts?.some((c) => c.publicKey === publicKey)) return;
      const updatedContacts = [
        ...(contacts || []),
        { publicKey, everBeenOnline: false, hasAddedEvent: true },
      ];
      setContacts(updatedContacts);
      if (!dontCreateEvent) {
        const event = {
          id: uuid(),
          type: "contact",
          fromPublicKey: globalPublicKey,
          toPublicKey: globalPublicKey,
          createdAt: new Date(),
          payload: JSON.stringify({
            publicKey,
            everBeenOnline: false,
            hasAddedEvent: true,
          }),
          acknowledged: true,
        };
        db.events.add(event);
      }
      window.localStorage.setItem(
        "securicator-contacts",
        JSON.stringify(updatedContacts)
      );
    },
    [contacts, globalPublicKey]
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
    async (publicKey: string, retentionLevel: number, content: string) => {
      const symmetricKey = await generateSymmetricKey();
      const encryptedSymmetricKey = await asymmetricEncrypt(
        symmetricKey,
        publicKey
      );
      const encryptedContent = await symmetricEncrypt(content, symmetricKey);
      websocket.current?.send(
        `${globalPublicKey} ${publicKey} ${retentionLevel} CONTACT_MESSAGE ${encryptedSymmetricKey} ${encryptedContent.iv} ${encryptedContent.encrypted}`
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
        acknowledged: false,
      };
      db.events.add(event);
      sendToContact(publicKey, 1, `EVENT ${JSON.stringify(event)}`);
    },
    [contacts, globalPublicKey, sendToContact]
  );

  const unreadContacts = useMemo(() => {
    return contacts.filter((c) => c.unread).length;
  }, [contacts]);

  useEffect(() => {
    if (unreadContacts) {
      setNotificationIcon();
    } else {
      removeNotificationIcon();
    }
  }, [unreadContacts]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = unreadContacts
      ? `(${unreadContacts}) ${originalTitle}`
      : originalTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [unreadContacts]);

  useEffect(() => {
    if (!connected || !globalPublicKey) return;
    const interval = setInterval(() => {
      sendToContact(
        globalPublicKey,
        0,
        `SAME_CONTACT_SYNC ${JSON.stringify({
          synchronizationId: getSynchronizationId(),
        })}`
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [connected, globalPublicKey, sendToContact]);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      // FIXME Will cause problems when updating the contacts (receiving updates)
      for (const contact of contacts) {
        sendToContact(
          contact.publicKey,
          0,
          `HEARTBEAT ${new Date().toISOString()}`
        );
        sendToContact(
          contact.publicKey,
          0,
          `CONTACT_INFO ${JSON.stringify({
            name,
            biography,
          })}`
        );
      }
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [connected, contacts, sendToContact, biography, name]);

  const synchronizationKey = useMemo(() => {
    if (!globalPrivateKey || !globalPublicKey) return undefined;
    return `${globalPrivateKey} ${globalPublicKey}`;
  }, [globalPrivateKey, globalPublicKey]);

  const sendUnackedEvents = useCallback(
    async (publicKey: string) => {
      const contactEvents = await db.events
        .where("toPublicKey")
        .equals(publicKey)
        .and((event) => event.acknowledged === false)
        .toArray();
      for (const event of contactEvents) {
        await sendToContact(publicKey, 1, `EVENT ${JSON.stringify(event)}`);
      }
    },
    [sendToContact]
  );

  useEffect(() => {
    if (!connected || !contacts.length) return;
    const now = Date.now();
    if (
      !lastResendUnackedMessagesAt ||
      Math.abs(now - lastResendUnackedMessagesAt) > 1000 * 60
    ) {
      contacts.forEach((contact) => {
        sendUnackedEvents(contact.publicKey);
      });
    }
  }, [connected, contacts, sendUnackedEvents, lastResendUnackedMessagesAt]);

  return (
    <SecuricatorContext.Provider
      value={{
        globalPrivateKey,
        globalPublicKey,
        isInitialized: initialized,
        addContact,
        contacts,
        sendMessage,
        name,
        changeName,
        connected,
        biography,
        changeBiography,
        showMenu,
        setShowMenu,
        setContactRead,
        hasConfiguredAccount,
        initializeNewAccount,
        initializeExistingAccount,
        synchronizationKey,
      }}
    >
      {children}
    </SecuricatorContext.Provider>
  );
};

export const useSecuricator = () => {
  return useContext(SecuricatorContext);
};
