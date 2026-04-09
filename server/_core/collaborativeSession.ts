/**
 * Collaborative Session Manager
 * Handles multi-user real-time story co-creation for families
 */
// @ts-nocheck


import { db } from "../db";
import {
  collaborativeSessions,
  sessionParticipants,
  storySegments,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Types ────────────────────────────────────────────────────

export interface Participant {
  userId: number;
  childId?: number;
  displayName: string;
  role: "host" | "contributor";
  joinedAt: Date;
  color: string;
  turnsCompleted: number;
}

export interface StorySegment {
  participantId: number;
  text: string;
  prompt: string;
  pageNumber: number;
  timestamp: Date;
  aiEnhanced: boolean;
}

export interface CollaborativeSession {
  id: number;
  arcId: number;
  hostUserId: number;
  participants: Participant[];
  currentTurnIndex: number;
  turnOrder: number[]; // participant userIds in turn order
  status: "waiting" | "active" | "paused" | "completed";
  storySegments: StorySegment[];
  maxParticipants: number;
  turnTimeLimit: number; // seconds, 0 = unlimited
  sessionCode: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SessionCreateSettings {
  maxParticipants?: number;
  turnTimeLimit?: number;
  aiEnhancementLevel?: "light" | "moderate" | "heavy";
}

// ─── Constants ────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
];

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ─── Session Management ────────────────────────────────────────

/**
 * Generate a random 6-character alphanumeric session code
 */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new collaborative session
 */
export async function createSession(
  hostUserId: number,
  arcId: number,
  settings?: SessionCreateSettings
): Promise<CollaborativeSession> {
  const code = generateSessionCode();
  const maxParticipants = settings?.maxParticipants ?? 4;
  const turnTimeLimit = settings?.turnTimeLimit ?? 120;

  const result = await db.insert(collaborativeSessions).values({
    arcId,
    hostUserId,
    sessionCode: code,
    status: "waiting",
    turnOrder: JSON.stringify([hostUserId]),
    currentTurnIndex: 0,
    turnTimeLimit,
    maxParticipants,
    createdAt: new Date(),
  });

  const sessionId = result[0].insertId;

  // Add host as first participant
  await db.insert(sessionParticipants).values({
    sessionId: Number(sessionId),
    userId: hostUserId,
    displayName: "Host",
    role: "host",
    color: AVATAR_COLORS[0],
    turnsCompleted: 0,
    joinedAt: new Date(),
  });

  return getSessionState(Number(sessionId));
}

/**
 * Join an existing collaborative session using a code
 */
export async function joinSession(
  sessionCode: string,
  userId: number,
  displayName: string
): Promise<CollaborativeSession> {
  // Find session by code
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.sessionCode, sessionCode))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.status !== "waiting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Can only join sessions in waiting state",
    });
  }

  // Check participant count
  const participants = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, session.id));

  if (participants.length >= session.maxParticipants) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Session is full (${session.maxParticipants} participants)`,
    });
  }

  // Check if user already joined
  const existing = participants.find((p) => p.userId === userId);
  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User already in session",
    });
  }

  // Assign next color
  const colorIndex = participants.length % AVATAR_COLORS.length;

  // Add participant
  await db.insert(sessionParticipants).values({
    sessionId: session.id,
    userId,
    displayName,
    role: "contributor",
    color: AVATAR_COLORS[colorIndex],
    turnsCompleted: 0,
    joinedAt: new Date(),
  });

  // Update turn order
  const turnOrder = JSON.parse(session.turnOrder || "[]") as number[];
  turnOrder.push(userId);
  await db
    .update(collaborativeSessions)
    .set({ turnOrder: JSON.stringify(turnOrder) })
    .where(eq(collaborativeSessions.id, session.id));

  return getSessionState(session.id);
}

/**
 * Get current session state
 */
export async function getSessionState(sessionId: number): Promise<CollaborativeSession> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  // Fetch participants
  const participantRows = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, sessionId));

  const participants: Participant[] = participantRows.map((p) => ({
    userId: p.userId,
    childId: p.childId || undefined,
    displayName: p.displayName,
    role: p.role as "host" | "contributor",
    joinedAt: p.joinedAt,
    color: p.color,
    turnsCompleted: p.turnsCompleted,
  }));

  // Fetch segments
  const segmentRows = await db
    .select()
    .from(storySegments)
    .where(eq(storySegments.sessionId, sessionId));

  const segments: StorySegment[] = segmentRows.map((s) => ({
    participantId: s.participantId,
    text: s.enhancedText,
    prompt: s.rawInput,
    pageNumber: s.pageNumber,
    timestamp: s.timestamp,
    aiEnhanced: true,
  }));

  return {
    id: session.id,
    arcId: session.arcId,
    hostUserId: session.hostUserId,
    participants,
    currentTurnIndex: session.currentTurnIndex,
    turnOrder: JSON.parse(session.turnOrder || "[]"),
    status: session.status as "waiting" | "active" | "paused" | "completed",
    storySegments: segments,
    maxParticipants: session.maxParticipants,
    turnTimeLimit: session.turnTimeLimit,
    sessionCode: session.sessionCode,
    createdAt: session.createdAt,
    completedAt: session.completedAt || undefined,
  };
}

/**
 * Submit a turn contribution
 */
export async function submitTurn(
  sessionId: number,
  participantId: number,
  input: string
): Promise<void> {
  const session = await getSessionState(sessionId);

  // Verify it's this participant's turn
  const turnOrder = session.turnOrder;
  if (turnOrder.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid session state",
    });
  }

  const currentParticipantId = turnOrder[session.currentTurnIndex % turnOrder.length];
  if (currentParticipantId !== participantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "It is not your turn",
    });
  }

  if (session.status !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Session is not active",
    });
  }

  // Validate input length (age-appropriate)
  const participant = session.participants.find((p) => p.userId === participantId);
  if (!participant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Participant not found",
    });
  }

  const minLength = 5;
  const maxLength = 500;

  if (input.trim().length < minLength) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Input too short (minimum ${minLength} characters)`,
    });
  }

  if (input.trim().length > maxLength) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Input too long (maximum ${maxLength} characters)`,
    });
  }

  // Save segment (raw input, will be enhanced by turnProcessor)
  const pageNumber = session.storySegments.length + 1;
  await db.insert(storySegments).values({
    sessionId,
    participantId,
    pageNumber,
    rawInput: input,
    enhancedText: input, // Will be updated after AI enhancement
    imagePrompt: "",
    timestamp: new Date(),
  });

  // Update participant turn count
  await db
    .update(sessionParticipants)
    .set({ turnsCompleted: (participant.turnsCompleted || 0) + 1 })
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.userId, participantId)
      )
    );
}

/**
 * Advance to next turn
 */
export async function advanceTurn(sessionId: number): Promise<void> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  const turnOrder = JSON.parse(session.turnOrder || "[]") as number[];
  if (turnOrder.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid turn order",
    });
  }

  const nextTurnIndex = (session.currentTurnIndex + 1) % turnOrder.length;

  await db
    .update(collaborativeSessions)
    .set({ currentTurnIndex: nextTurnIndex })
    .where(eq(collaborativeSessions.id, sessionId));
}

/**
 * Start the collaborative session (move from waiting to active)
 */
export async function startSession(sessionId: number, hostUserId: number): Promise<void> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.hostUserId !== hostUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only host can start session",
    });
  }

  if (session.status !== "waiting") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Session is not in waiting state",
    });
  }

  await db
    .update(collaborativeSessions)
    .set({ status: "active" })
    .where(eq(collaborativeSessions.id, sessionId));
}

/**
 * End the collaborative session
 */
export async function endSession(sessionId: number): Promise<void> {
  await db
    .update(collaborativeSessions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(collaborativeSessions.id, sessionId));
}

/**
 * Leave a collaborative session
 */
export async function leaveSession(sessionId: number, userId: number): Promise<void> {
  const session = await getSessionState(sessionId);

  // Check if host is leaving
  if (session.hostUserId === userId) {
    // If host leaves, end the session
    await endSession(sessionId);
  } else {
    // Remove participant
    await db
      .delete(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.userId, userId)
        )
      );

    // Update turn order
    const turnOrder = session.turnOrder.filter((id) => id !== userId);
    await db
      .update(collaborativeSessions)
      .set({
        turnOrder: JSON.stringify(turnOrder),
        currentTurnIndex: Math.min(session.currentTurnIndex, turnOrder.length - 1),
      })
      .where(eq(collaborativeSessions.id, sessionId));
  }
}

/**
 * Pause a collaborative session
 */
export async function pauseSession(sessionId: number, hostUserId: number): Promise<void> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.hostUserId !== hostUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only host can pause session",
    });
  }

  await db
    .update(collaborativeSessions)
    .set({ status: "paused" })
    .where(eq(collaborativeSessions.id, sessionId));
}

/**
 * Resume a paused collaborative session
 */
export async function resumeSession(sessionId: number, hostUserId: number): Promise<void> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.hostUserId !== hostUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only host can resume session",
    });
  }

  if (session.status !== "paused") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Session is not paused",
    });
  }

  await db
    .update(collaborativeSessions)
    .set({ status: "active" })
    .where(eq(collaborativeSessions.id, sessionId));
}

/**
 * Skip to next participant's turn (host only)
 */
export async function skipTurn(sessionId: number, hostUserId: number): Promise<void> {
  const [session] = await db
    .select()
    .from(collaborativeSessions)
    .where(eq(collaborativeSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  if (session.hostUserId !== hostUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only host can skip turns",
    });
  }

  const turnOrder = JSON.parse(session.turnOrder || "[]") as number[];
  if (turnOrder.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid turn order",
    });
  }

  const nextTurnIndex = (session.currentTurnIndex + 1) % turnOrder.length;
  await db
    .update(collaborativeSessions)
    .set({ currentTurnIndex: nextTurnIndex })
    .where(eq(collaborativeSessions.id, sessionId));
}
