import { useState, useEffect, useCallback } from 'react';
import { api, Item, ItemsResponse } from '../services/api';
import { syncFromServer, getCachedItems } from '../services/offlineDb';

export function useItems(search?: string, filterStyle?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ItemsResponse = await api.getItems(search, filterStyle);
      setItems(response.items);
      // Cache for offline use
      await syncFromServer(response.items);
      setIsOffline(false);
    } catch (err: any) {
      // Try offline cache
      console.warn('Failed to fetch from server, using cache:', err.message);
      try {
        const cached = await getCachedItems();
        let filtered = cached;
        if (search) {
          filtered = filtered.filter(i =>
            i.item_name.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (filterStyle) {
          filtered = filtered.filter(i => i.packaging_style === filterStyle);
        }
        setItems(filtered as Item[]);
        setIsOffline(true);
      } catch {
        setError('Unable to load items. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterStyle]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); fetchItems(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchItems]);

  return { items, loading, error, isOffline, refetch: fetchItems };
}
