import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertChild, children,
  InsertStoryArc, storyArcs,
  InsertEpisode, episodes,
  InsertPage, pages,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---- Children helpers ----
export async function getChildren(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(children).where(eq(children.userId, userId)).orderBy(desc(children.createdAt));
}

export async function getChild(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(children).where(and(eq(children.id, id), eq(children.userId, userId))).limit(1);
  return result[0];
}

export async function createChild(data: InsertChild) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(children).values(data);
  return result.insertId;
}

export async function updateChild(id: number, userId: number, data: Partial<InsertChild>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(children).set(data).where(and(eq(children.id, id), eq(children.userId, userId)));
}

export async function deleteChild(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(children).where(and(eq(children.id, id), eq(children.userId, userId)));
}

// ---- Story Arc helpers ----
export async function getStoryArcs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storyArcs).where(eq(storyArcs.userId, userId)).orderBy(desc(storyArcs.updatedAt));
}

export async function getStoryArc(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(storyArcs).where(and(eq(storyArcs.id, id), eq(storyArcs.userId, userId))).limit(1);
  return result[0];
}

export async function createStoryArc(data: InsertStoryArc) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(storyArcs).values(data);
  return result.insertId;
}

export async function updateStoryArc(id: number, data: Partial<InsertStoryArc>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(storyArcs).set(data).where(eq(storyArcs.id, id));
}

// ---- Episode helpers ----
export async function getEpisodes(storyArcId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(episodes).where(eq(episodes.storyArcId, storyArcId)).orderBy(episodes.episodeNumber);
}

export async function getEpisode(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
  return result[0];
}

export async function createEpisode(data: InsertEpisode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(episodes).values(data);
  return result.insertId;
}

export async function markEpisodeRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(episodes).set({ isRead: true }).where(eq(episodes.id, id));
}

// ---- Page helpers ----
export async function getPages(episodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pages).where(eq(pages.episodeId, episodeId)).orderBy(pages.pageNumber);
}

export async function createPages(data: InsertPage[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(pages).values(data);
}
