import getMongoClient from "./mongodb";

export type WebinarStatus = "scheduled" | "live" | "ended";

export interface Webinar {
  id: string;
  title: string;
  status: WebinarStatus;
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
}

interface WebinarDoc {
  _id: string;
  title: string;
  status: WebinarStatus;
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
}

function toWebinar(doc: WebinarDoc): Webinar {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

async function getCollection() {
  const client = await getMongoClient();
  // Explicit db name so this works even if MONGODB_URI doesn't include one
  // (e.g. Atlas connection strings copied from the dashboard usually don't).
  return client.db("webinar_portal").collection<WebinarDoc>("webinars");
}

export async function listWebinars(): Promise<Webinar[]> {
  const collection = await getCollection();
  const docs = await collection.find().sort({ createdAt: -1 }).toArray();
  return docs.map(toWebinar);
}

export async function getWebinar(id: string): Promise<Webinar | undefined> {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: id });
  return doc ? toWebinar(doc) : undefined;
}

export async function createWebinar(title: string, scheduledAt?: string): Promise<Webinar> {
  const collection = await getCollection();
  const doc: WebinarDoc = {
    _id: crypto.randomUUID().slice(0, 8),
    title,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    ...(scheduledAt ? { scheduledAt } : {}),
  };
  await collection.insertOne(doc);
  return toWebinar(doc);
}

export async function updateWebinarStatus(
  id: string,
  status: WebinarStatus
): Promise<Webinar | undefined> {
  const collection = await getCollection();

  const timestampField =
    status === "live" ? "startedAt" : status === "ended" ? "endedAt" : undefined;

  const updated = await collection.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status,
        ...(timestampField ? { [timestampField]: new Date().toISOString() } : {}),
      },
    },
    { returnDocument: "after" }
  );

  return updated ? toWebinar(updated) : undefined;
}

export async function deleteWebinar(id: string): Promise<boolean> {
  const collection = await getCollection();
  const { deletedCount } = await collection.deleteOne({ _id: id });
  return deletedCount === 1;
}
