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
import { sign } from "../utils/sign";
import { generateSignatureKeyPair } from "../utils/generateSignatureKeyPair";
import { verify } from "../utils/verify";

async function getSignatureKeyPair() {
  const savedSignatureKeyPair = window.localStorage.getItem(
    "securicator-signature-keypair"
  );
  if (savedSignatureKeyPair) {
    const parts = savedSignatureKeyPair.split(" ");
    return {
      privateKey: parts[0],
      publicKey: parts[1],
    };
  } else {
    const created = await generateSignatureKeyPair();
    window.localStorage.setItem(
      "securicator-signature-keypair",
      `${created.privateKey} ${created.publicKey}`
    );
    return created;
  }
}

function getSavedContacts(): Contact[] {
  const contacts = window.localStorage.getItem("securicator-contacts");
  if (!contacts) return [];
  let savedContacts = JSON.parse(contacts) || [];
  return savedContacts.map((contact: any) => ({
    ...contact,
    lastSeenAt: contact.lastSeenAt ? new Date(contact.lastSeenAt) : undefined,
  }));
}

function setContactMessagesAsRead(publicKey: string) {
  const contacts = getSavedContacts();
  const newContacts = contacts.map((contact) => {
    if (contact.publicKey === publicKey) {
      contact.unread = false;
    }
    return contact;
  });
  window.localStorage.setItem(
    "securicator-contacts",
    JSON.stringify(newContacts)
  );
  return getSavedContacts();
}

function setContactHasUnreadMessages(publicKey: string) {
  const contacts = getSavedContacts();
  const newContacts = contacts.map((contact) => {
    if (contact.publicKey === publicKey) {
      contact.unread = true;
    }
    return contact;
  });
  window.localStorage.setItem(
    "securicator-contacts",
    JSON.stringify(newContacts)
  );
  return getSavedContacts();
}

function updateContactLastSeen(publicKey: string, time: Date) {
  const contacts = getSavedContacts();
  const newContacts = contacts.map((contact) => {
    if (contact.publicKey === publicKey) {
      contact.lastSeenAt = time;
    }
    return contact;
  });
  window.localStorage.setItem(
    "securicator-contacts",
    JSON.stringify(newContacts)
  );
  return getSavedContacts();
}

function updateContactDetails(
  publicKey: string,
  { name, biography }: { name?: string; biography?: string }
) {
  const contacts = getSavedContacts();
  const newContacts = contacts.map((contact) => {
    if (contact.publicKey === publicKey) {
      contact.displayName = name;
      contact.biography = biography;
    }
    return contact;
  });
  window.localStorage.setItem(
    "securicator-contacts",
    JSON.stringify(newContacts)
  );
  return getSavedContacts();
}

function addContactToContacts(publicKey: string) {
  const contacts = getSavedContacts();
  const exists = contacts.some((c) => c.publicKey === publicKey);
  if (exists) {
    return contacts;
  }
  const newContacts = [
    ...contacts,
    { publicKey: publicKey, everBeenOnline: false, hasAddedEvent: true },
  ];
  window.localStorage.setItem(
    "securicator-contacts",
    JSON.stringify(newContacts)
  );
  return getSavedContacts();
}

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

function initializeAccount() {
  const existingAccount = window.localStorage.getItem("securicator-account");
  if (existingAccount) {
    return JSON.parse(existingAccount);
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
  changeContactInformation: (data: {
    name?: string;
    biography?: string;
  }) => any;
  connected: boolean;
  biography: string;
  setContactRead: (publicKey: string) => void;
  hasConfiguredAccount: boolean;
  initializeNewAccount: () => void;
  initializeExistingAccount: (synchronizationKey: string) => void;
  synchronizationKey?: string;
  publicKeyToDisplayName: (publicKey: string) => string;
  receivedCount: number;
  sentCount: number;
}

export interface Contact {
  publicKey: string;
  displayName?: string;
  biography?: string;
  everBeenOnline: boolean;
  unread?: boolean;
  lastSeenAt?: Date;
}

async function saveEvent(event: Event) {
  const count = await db.events.where("id").equals(event.id).count();
  if (count > 0) return;
  await db.events.add(event);
}

const SecuricatorContext = createContext<Props>({} as Props);

export const SecuricatorProvider: FC<any> = ({ children }) => {
  const [globalPrivateKey, setGlobalPrivateKey] = useState<string>();
  const [globalPublicKey, setGlobalPublicKey] = useState<string>();
  const [contacts, setContacts] = useState<Contact[]>(getSavedContacts());
  const [name, setName] = useState<string>("");
  const [biography, setBiography] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const websocket = useRef<WebSocket | null>(null);
  const [websocketReloadCount, setWebsocketReloadCount] = useState<number>(1);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [hasConfiguredAccount, setHasConfiguredAccount] =
    useState<boolean>(false);
  const [lastResendUnackedMessagesAt, setLastResendUnackedMessagesAt] =
    useState<number>();
  const [lastReceivedPong, setLastReceivedPong] = useState<number>(0);
  const contactsRef = useRef<Contact[]>([]);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);

  useEffect(() => {
    if (lastReceivedPong > 0) {
      setConnected(true);
    }
    const timeout = setTimeout(() => {
      if (websocket.current && lastReceivedPong !== 0) {
        setConnected(false);
        websocket.current.close();
      }
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [lastReceivedPong]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  const initializeNewAccount = useCallback(async () => {
    const { privateKey, publicKey } = await generateKeypair();
    window.localStorage.setItem(
      "securicator-account",
      JSON.stringify({ privateKey, publicKey })
    );
    window.location.replace("/");
  }, []);

  const initializeExistingAccount = useCallback(
    (synchronizationKey: string) => {
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
    content: { id: string; deliveredAt: string },
    event: Event
  ) {
    const envelope = await db.envelopes.get({
      id: content.id,
    });
    if (!envelope) {
      return console.log(`Envelope ${content.id} not found`);
    }
    if (envelope.deliveredAt) {
      return console.log("Envelope already delivered");
    }
    await saveEvent({
      ...event,
      acknowledged: true,
    });
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
    setContacts(setContactMessagesAsRead(publicKey));
  }, []);

  async function sendEventsAfter(date: Date) {
    if (!globalPublicKey) return;
    const events = await db.events
      .where("createdAt")
      .aboveOrEqual(date)
      .toArray();
    events.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
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
        return await sendToContact(
          event.fromPublicKey,
          1,
          `ACK_EVENT ${JSON.stringify({
            id: event.id,
            acknowledged: true,
          })}`
        );
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
          setContacts(setContactHasUnreadMessages(envelope.senderPublicKey));
          const savedContacts = getSavedContacts();
          const contactExists = savedContacts.some(
            (c) => c.publicKey === envelope.senderPublicKey
          );
          if (!contactExists) {
            addContact(envelope.senderPublicKey);
          }
          await db.envelopes.add(envelope);
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
          await saveEvent(deliveredEvent);
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
        await handleEnvelopeDelivered(
          event.fromPublicKey,
          JSON.parse(event.payload),
          event
        );
        break;
      case "contact-info":
        handleContactInfoReceived(
          event.fromPublicKey,
          JSON.parse(event.payload)
        );
        break;
    }
  }

  function handleContactInfoReceived(
    publicKey: string,
    info: { name?: string; biography?: string }
  ) {
    const contact = contacts.find((c) => c.publicKey === publicKey);
    if (!contact) {
      setContacts(addContactToContacts(publicKey));
    }
    setContacts(
      updateContactDetails(publicKey, {
        name: info.name,
        biography: info.biography,
      })
    );
  }

  function handleHeartbeatReceived(publicKey: string, innerContent: string) {
    const time = new Date(innerContent);
    setContacts(updateContactLastSeen(publicKey, time));
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

  function handleSameContactSync(innerContent: string) {
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
    const [signature, encryptedSymmetricKey, iv, encrypted] =
      rawContent.split(" ");
    const symmetricKey = await asymmetricDecrypt(
      encryptedSymmetricKey,
      globalPrivateKey
    );
    const contentWithSignatureKey = await symmetricDecrypt(
      encrypted,
      symmetricKey,
      iv
    );
    const signaturePublicKey = contentWithSignatureKey.split(" ")[0];
    const signableContent = `${encryptedSymmetricKey} ${iv} ${encrypted}`;
    const passedVerification = await verify(
      signableContent,
      signaturePublicKey,
      signature
    );
    if (!passedVerification) {
      console.log("Failed message signature validation");
      return;
    }
    const [verb, ...rest] = contentWithSignatureKey.split(" ").slice(1);
    const innerContent = rest.join(" ");

    switch (verb) {
      case "EVENT":
        const event = JSON.parse(innerContent);
        event.createdAt = new Date(event.createdAt);
        try {
          await handleEventReceived(event);
        } catch (error: any) {
          console.error(`Error processing received event: ${error.message}`);
          console.error(error);
        }
        break;
      case "ACK_EVENT":
        const content = JSON.parse(innerContent);
        await db.events.update(content.id, {
          acknowledged: true,
        });
        break;
      case "HEARTBEAT":
        handleHeartbeatReceived(publicKey, innerContent);
        sendUnackedEvents(publicKey);
        break;
      case "SAME_CONTACT_SYNC":
        // handleSameContactSync(innerContent);
        break;
    }
  }

  useEffect(() => {
    if (!globalPublicKey || !globalPrivateKey) return;
    if (!websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
      websocket.current = new WebSocket(
        process.env.REACT_APP_WEBSOCKET_URL || "ws://localhost:9093",
        "protocolOne"
      );
    }
    if (!websocket.current) return;

    let receiving = false;

    websocket.current.onmessage = async (event) => {
      setReceivedCount((old) => old + 1);
      if (event.data === "PONG") {
        return setLastReceivedPong(new Date().getTime());
      }

      const parts = event.data
        .trim()
        .split(" ")
        .map((part: string) => part.trim());
      const contactGlobalPublicKey = parts[0];
      const myGlobalPublicKey = parts[1];
      const verb = parts[3].replace(/gpk_/, "");
      const content = parts.slice(4).join(" ");

      if (verb === "CONTACT_MESSAGE") {
        while (receiving) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        try {
          receiving = true;
          await handleInnerMessage(contactGlobalPublicKey, content);
        } finally {
          receiving = false;
        }
      }
    };
    websocket.current.onopen = () => {
      websocket.current?.send(`CONNECT ${globalPublicKey}`);
      setSentCount((old) => old + 1);
      setInterval(() => {
        websocket.current?.send(`PING`);
        setSentCount((old) => old + 1);
      }, 1000);
    };
    websocket.current.onerror = (e) => {
      console.error("Socket errored", e);
    };
    websocket.current.onclose = (e) => {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(() => {
        setWebsocketReloadCount((old) => old + 1);
      }, Math.min(websocketReloadCount * 1000, 10000));
    };
  }, [globalPublicKey, globalPrivateKey, websocketReloadCount]);

  useEffect(() => {
    const account = initializeAccount();
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
  }, []);

  const createContactInfoEvent = useCallback(
    async (
      publicKey: string,
      {
        name: newName,
        biography: newBiography,
      }: { name?: string; biography?: string }
    ) => {
      if (!globalPublicKey) return;
      const event = {
        id: uuid(),
        type: "contact-info",
        fromPublicKey: globalPublicKey,
        toPublicKey: publicKey,
        createdAt: new Date(),
        payload: JSON.stringify({
          name: newName || name,
          biography: newBiography || biography,
        }),
        acknowledged: false,
      };
      await db.events.add(event);
      return event;
    },
    [name, biography, globalPublicKey]
  );

  const addContact = useCallback(
    (publicKey: string, dontCreateEvent?: boolean) => {
      if (!globalPublicKey) return;
      if (publicKey === globalPublicKey) return;
      setContacts(addContactToContacts(publicKey));
      createContactInfoEvent(publicKey, {});
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
    },
    [globalPublicKey, createContactInfoEvent]
  );

  const sendToContact = useCallback(
    async (publicKey: string, retentionLevel: number, content: string) => {
      const symmetricKey = await generateSymmetricKey();
      const encryptedSymmetricKey = await asymmetricEncrypt(
        symmetricKey,
        publicKey
      );
      const { privateKey: signaturePrivateKey, publicKey: signaturePublicKey } =
        await getSignatureKeyPair();
      const encryptedContent = await symmetricEncrypt(
        `${signaturePublicKey} ${content}`,
        symmetricKey
      );
      if (
        websocket.current &&
        websocket.current?.readyState === WebSocket.OPEN
      ) {
        if (!globalPrivateKey) return;
        const signableContent = `${encryptedSymmetricKey} ${encryptedContent.iv} ${encryptedContent.encrypted}`;
        const signature = await sign(signableContent, signaturePrivateKey);
        websocket.current.send(
          `${globalPublicKey} ${publicKey} ${retentionLevel} CONTACT_MESSAGE ${signature} ${signableContent}`
        );
        setSentCount((old) => old + 1);
      }
    },
    [globalPublicKey, globalPrivateKey]
  );

  const changeContactInformation = useCallback(
    async ({ name, biography }: { name?: string; biography?: string }) => {
      name = name || "";
      biography = biography || "";

      setName(name);
      setBiography(biography);

      window.localStorage.setItem(
        "securicator-account",
        JSON.stringify({
          privateKey: globalPrivateKey,
          publicKey: globalPublicKey,
          name: name,
          biography: biography,
        })
      );

      const contacts = getSavedContacts();
      for (const contact of contacts) {
        const createdEvent = await createContactInfoEvent(contact.publicKey, {
          name: name,
          biography: biography,
        });
        sendToContact(
          contact.publicKey,
          1,
          `EVENT ${JSON.stringify(createdEvent)}`
        );
      }
    },
    [globalPrivateKey, globalPublicKey, createContactInfoEvent, sendToContact]
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
      if (!contactsRef.current) return;
      for (const contact of contactsRef.current) {
        sendToContact(
          contact.publicKey,
          0,
          `HEARTBEAT ${new Date().toISOString()}`
        );
      }
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [connected, sendToContact, biography, name]);

  const synchronizationKey = useMemo(() => {
    if (!globalPrivateKey || !globalPublicKey) return undefined;
    return `${globalPrivateKey} ${globalPublicKey}`;
  }, [globalPrivateKey, globalPublicKey]);

  const sendUnackedEvents = useCallback(
    async (publicKey: string) => {
      const contactEvents = await db.events
        .where("toPublicKey")
        .equals(publicKey)
        .and((event) => !event.acknowledged)
        .toArray();
      for (const event of contactEvents) {
        await sendToContact(
          event.toPublicKey,
          1,
          `EVENT ${JSON.stringify(event)}`
        );
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

  const publicKeyToDisplayName = useCallback(
    (pk: string) => {
      if (pk === globalPublicKey) return name || pk;
      const foundContact = contacts.find((c) => c.publicKey === pk);
      if (foundContact) return foundContact.displayName || pk;
      return pk;
    },
    [globalPublicKey, name, contacts]
  );

  return (
    <SecuricatorContext.Provider
      value={{
        publicKeyToDisplayName,
        globalPrivateKey,
        globalPublicKey,
        isInitialized: initialized,
        addContact,
        contacts,
        sendMessage,
        name,
        connected,
        biography,
        setContactRead,
        hasConfiguredAccount,
        initializeNewAccount,
        initializeExistingAccount,
        synchronizationKey,
        changeContactInformation,
        sentCount,
        receivedCount,
      }}
    >
      {children}
    </SecuricatorContext.Provider>
  );
};

export const useSecuricator = () => {
  return useContext(SecuricatorContext);
};
