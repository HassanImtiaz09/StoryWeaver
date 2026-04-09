import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Global store for the currently selected child.
 * Used by useColors and other features to apply age-appropriate theming.
 */

const SELECTED_CHILD_KEY = "storyweaver_selected_child_id";
const SELECTED_CHILD_AGE_KEY = "storyweaver_selected_child_age";

let selectedChildId: string | null = null;
let selectedChildAge: number | null = null;

// In-memory listeners for theme changes
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export interface SelectedChild {
  id: string;
  age: number;
}

/**
 * Set the currently selected child (called when user selects a child in the UI)
 */
export async function setSelectedChild(childId: string, age: number): Promise<void> {
  selectedChildId = childId;
  selectedChildAge = age;

  // Persist to AsyncStorage
  try {
    await AsyncStorage.setItem(SELECTED_CHILD_KEY, childId);
    await AsyncStorage.setItem(SELECTED_CHILD_AGE_KEY, age.toString());
  } catch (err) {
    console.warn("[ChildContextStore] Failed to persist selected child:", err);
  }

  // Notify all listeners (hooks) that the selection changed
  notifyListeners();
}

/**
 * Get the currently selected child
 */
export function getSelectedChild(): SelectedChild | null {
  if (selectedChildId && selectedChildAge !== null) {
    return { id: selectedChildId, age: selectedChildAge };
  }
  return null;
}

/**
 * Get only the age of the selected child (for useColors)
 */
export function getSelectedChildAge(): number | null {
  return selectedChildAge;
}

/**
 * Clear the selected child
 */
export function clearSelectedChild(): void {
  selectedChildId = null;
  selectedChildAge = null;
  try {
    AsyncStorage.removeItem(SELECTED_CHILD_KEY);
    AsyncStorage.removeItem(SELECTED_CHILD_AGE_KEY);
  } catch (err) {
    console.warn("[ChildContextStore] Failed to clear selected child:", err);
  }
  notifyListeners();
}

/**
 * Load the previously selected child from AsyncStorage
 * Call this on app startup
 */
export async function loadSelectedChild(): Promise<void> {
  try {
    const childId = await AsyncStorage.getItem(SELECTED_CHILD_KEY);
    const ageStr = await AsyncStorage.getItem(SELECTED_CHILD_AGE_KEY);

    if (childId && ageStr) {
      selectedChildId = childId;
      selectedChildAge = parseInt(ageStr, 10);
      notifyListeners();
    }
  } catch (err) {
    console.warn("[ChildContextStore] Failed to load selected child:", err);
  }
}

/**
 * Subscribe to child selection changes
 */
export function onSelectedChildChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners of a change
 */
function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn("[ChildContextStore] Listener error:", err);
    }
  });
}
