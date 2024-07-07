import Dexie from "dexie";

export interface Envelope {
  id: string;
  content: string;
  senderPublicKey: string;
  receiverPublicKey: string;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface Event {
  id: string;
  type: string;
  fromPublicKey: string;
  toPublicKey: string;
  createdAt: Date;
  payload: string;
}

export const db = new Dexie("securicator") as Dexie & {
  envelopes: Dexie.Table<Envelope, number>;
  events: Dexie.Table<Event, number>;
};

db.version(1).stores({
  envelopes:
    "&id, content, senderPublicKey, receiverPublicKey, createdAt, deliveredAt, readAt",
  events: "&id, type, fromPublicKey, toPublicKey, createdAt, payload",
});
