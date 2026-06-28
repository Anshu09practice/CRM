import { useRef, useState, useCallback } from 'react';

interface UseSwipeActionsOptions {
  /** Called when the user swipes left past the threshold (reveal right action, e.g. delete) */
  onSwipeLeft?: () => void;
  /** Called when the user swipes right past the threshold (reveal left action, e.g. quick-pay) */
  onSwipeRight?: () => void;
  /** Minimum px distance before a swipe is committed. Default: 72 */
  threshold?: number;
  /** Maximum px the item can be dragged. Default: 80 */
  maxReveal?: number;
}

interface UseSwipeActionsReturn {
  /** Current horizontal offset in px — bind to a CSS `transform: translateX()` for visual feedback */
  swipeX: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Lightweight swipe-action hook using native touch events.
 * No library dependency — uses touchstart/touchmove/touchend directly.
 *
 * Usage:
 *   const { swipeX, onTouchStart, onTouchMove, onTouchEnd } = useSwipeActions({
 *     onSwipeLeft: () => handleDelete(id),
 *     onSwipeRight: () => handleQuickPay(id),
 *   });
 *
 *   <div
 *     style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
 *     onTouchStart={onTouchStart}
 *     onTouchMove={onTouchMove}
 *     onTouchEnd={onTouchEnd}
 *   />
 */
export function useSwipeActions({
  onSwipeLeft,
  onSwipeRight,
  threshold = 72,
  maxReveal = 80,
}: UseSwipeActionsOptions = {}): UseSwipeActionsReturn {
  const startX = useRef(0);
  const startY = useRef(0);
  const committedDelta = useRef(0);
  const directionLock = useRef<'horizontal' | 'vertical' | null>(null);

  // `swipeX` drives the visual transform; `committedDelta` ref avoids stale closures in onTouchEnd
  const [swipeX, setSwipeX] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    committedDelta.current = 0;
    directionLock.current = null;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Lock scroll direction on first significant movement
      if (!directionLock.current) {
        if (Math.abs(dx) > Math.abs(dy) + 4) directionLock.current = 'horizontal';
        else if (Math.abs(dy) > Math.abs(dx) + 4) directionLock.current = 'vertical';
      }

      if (directionLock.current !== 'horizontal') return;

      // Prevent page scroll while swiping horizontally
      e.preventDefault();

      const clamped = Math.max(-maxReveal, Math.min(maxReveal, dx));
      committedDelta.current = clamped;
      setSwipeX(clamped);
    },
    [maxReveal],
  );

  const onTouchEnd = useCallback(() => {
    const delta = committedDelta.current;
    committedDelta.current = 0;
    // Snap back regardless of outcome
    setSwipeX(0);

    if (Math.abs(delta) >= threshold) {
      if (delta < 0 && onSwipeLeft) onSwipeLeft();
      else if (delta > 0 && onSwipeRight) onSwipeRight();
    }
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return { swipeX, onTouchStart, onTouchMove, onTouchEnd };
}
