/**
 * useTooltip — Hook for managing first-time user tooltips on a screen.
 *
 * Usage:
 * ```tsx
 * const { activeTooltip, dismiss, handleAction } = useTooltip("home", {
 *   hasChildren: children.length > 0,
 *   hasStories: arcs.length > 0,
 * });
 * ```
 */
import { useState, useEffect, useCallback } from "react";
import {
  getActiveTooltip,
  dismissTooltip,
  type TooltipConfig,
} from "@/lib/tooltip-store";
import { useRouter } from "expo-router";

export function useTooltip(
  screen: TooltipConfig["screen"],
  context: {
    hasChildren: boolean;
    hasStories: boolean;
  },
  /** Set to false to delay tooltip loading (e.g., while data is loading) */
  enabled: boolean = true
) {
  const router = useRouter();
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    (async () => {
      const tooltip = await getActiveTooltip(screen, context);
      if (!cancelled) {
        setActiveTooltip(tooltip);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screen, context.hasChildren, context.hasStories, enabled]);

  const dismiss = useCallback(async () => {
    if (activeTooltip) {
      await dismissTooltip(activeTooltip.id);
      setActiveTooltip(null);
    }
  }, [activeTooltip]);

  const handleAction = useCallback(() => {
    if (activeTooltip?.actionRoute) {
      router.push(activeTooltip.actionRoute as any);
    }
  }, [activeTooltip, router]);

  return {
    activeTooltip,
    dismiss,
    handleAction,
  };
}
