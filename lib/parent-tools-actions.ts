/**
 * Parent tools async actions — bridges tRPC API calls with the Zustand store.
 *
 * Components should import these functions to trigger server calls.
 * The store itself remains a pure state container with no tRPC dependency.
 */
// @ts-nocheck

import { trpc } from "./trpc";
import {
  useParentToolsStore,
  type CustomElement,
  type VoiceRecording,
  type ApprovalQueueItem,
  type ChildStoryPreferences,
} from "./parent-tools-store";

// ─── Custom Elements ───────────────────────────────────────

export async function fetchCustomElements(childId: number): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const elements = await trpc.parentTools.getCustomElements.query({ childId });
    await store.setCustomElements(childId, elements);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch custom elements";
    store.setError(message);
  }
}

export async function createCustomElement(
  childId: number,
  elementType: CustomElement["elementType"],
  name: string,
  description?: string,
  imageUrl?: string
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const newElement = await trpc.parentTools.createCustomElement.mutate({
      childId,
      elementType,
      name,
      description,
      imageUrl,
    });
    await store.addCustomElement(childId, newElement as CustomElement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create custom element";
    store.setError(message);
  }
}

export async function updateCustomElement(
  elementId: number,
  updates: { name?: string; description?: string; imageUrl?: string }
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const updated = await trpc.parentTools.updateCustomElement.mutate({
      elementId,
      ...updates,
    });
    await store.replaceCustomElement(elementId, updated as CustomElement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update custom element";
    store.setError(message);
  }
}

export async function deleteCustomElement(elementId: number): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    await trpc.parentTools.deleteCustomElement.mutate({ elementId });
    await store.removeCustomElement(elementId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete custom element";
    store.setError(message);
  }
}

// ─── Voice Recordings ──────────────────────────────────────

export async function fetchVoiceRecordings(childId: number): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const recordings = await trpc.parentTools.getVoiceRecordings.query({ childId });
    await store.setVoiceRecordings(childId, recordings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch voice recordings";
    store.setError(message);
  }
}

export async function createVoiceRecording(
  childId: number,
  voiceName: string,
  sampleAudioUrl?: string
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const newRecording = await trpc.parentTools.createVoiceRecording.mutate({
      childId,
      voiceName,
      sampleAudioUrl,
    });
    await store.addVoiceRecording(childId, newRecording as VoiceRecording);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create voice recording";
    store.setError(message);
  }
}

export async function updateVoiceRecordingStatus(
  recordingId: number,
  status: VoiceRecording["status"],
  voiceModelId?: string
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    await trpc.parentTools.updateVoiceRecordingStatus.mutate({
      recordingId,
      status,
      voiceModelId,
    });
    await store.updateRecordingInStore(recordingId, status, voiceModelId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update voice recording";
    store.setError(message);
  }
}

// ─── Approval Queue ────────────────────────────────────────

export async function fetchPendingApprovals(): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const queue = await trpc.parentTools.getPendingApprovals.query();
    await store.setApprovalQueue(queue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch pending approvals";
    store.setError(message);
  }
}

export async function submitEpisodeForApproval(
  childId: number,
  episodeId: number
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const queueItem = await trpc.parentTools.submitForApproval.mutate({
      childId,
      episodeId,
    });
    await store.addToApprovalQueue(queueItem as ApprovalQueueItem);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit episode for approval";
    store.setError(message);
  }
}

export async function reviewEpisode(
  queueId: number,
  status: "approved" | "rejected" | "edited",
  parentNotes?: string,
  editedContent?: Record<string, unknown>
): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    await trpc.parentTools.reviewEpisode.mutate({
      queueId,
      status,
      parentNotes,
      editedContent,
    });
    await store.updateApprovalItem(queueId, status, parentNotes, editedContent);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to review episode";
    store.setError(message);
  }
}

// ─── Preferences ──────────────────────────────────────────

export async function fetchChildPreferences(childId: number): Promise<void> {
  const store = useParentToolsStore.getState();
  store.setLoading(true);
  try {
    const preferences = await trpc.parentTools.getChildStoryPreferences.query({
      childId,
    });
    await store.setChildPreferences(childId, preferences as ChildStoryPreferences);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch preferences";
    store.setError(message);
  }
}
