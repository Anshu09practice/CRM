import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../src/hooks/useDebounce';

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 100 } }
    );

    expect(result.current).toBe('hello');

    rerender({ value: 'world', delay: 100 });
    // Should still be old value immediately
    expect(result.current).toBe('hello');

    // After delay, should update
    await new Promise(r => setTimeout(r, 150));
    expect(result.current).toBe('world');
  });
});
