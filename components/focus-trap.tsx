// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { View, AccessibilityInfo, findNodeHandle, ViewProps } from 'react-native';

interface FocusTrapProps extends ViewProps {
  active?: boolean;
  children: React.ReactNode;
}

export function FocusTrap({ active = true, children, ...viewProps }: FocusTrapProps) {
  const containerRef = useRef<View>(null);
  const previousFocusRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store the currently focused element before we trap focus
    AccessibilityInfo.focusableElementsInViewDescendants(containerRef).then(() => {
      // Small delay to ensure the modal content is rendered
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const handle = findNodeHandle(containerRef.current);
          if (handle) {
            previousFocusRef.current = handle;
            AccessibilityInfo.setAccessibilityFocus(handle);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    });

    return () => {
      // Restore focus to the previously focused element on unmount
      if (previousFocusRef.current) {
        AccessibilityInfo.setAccessibilityFocus(previousFocusRef.current);
      }
    };
  }, [active]);

  return (
    <View
      ref={containerRef}
      accessibilityViewIsModal={active}
      {...viewProps}
    >
      {children}
    </View>
  );
}
