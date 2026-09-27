/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { OverpassAPI } from '../js/services/OverpassAPI.js';

describe('OverpassAPI', () => {
  let api;

  beforeEach(() => {
    // Reset global state
    global.window = {};
    api = new OverpassAPI();
    // Unique cache key for test isolation
    api.cacheKey = 'onthespot_osm_cache_' + Math.random();
    
    // Mock fetch
    global.fetch = vi.fn();
  });

  it('initializes with correct default values', () => {
    expect(api.isFetching).toBe(false);
    expect(api.cacheKey).toMatch(/^onthespot_osm_cache/);
    expect(api.lastFetchTime).toBe(0);
  });

  it('handles empty results from OSM gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    });

    const result = await api.fetchSpots({ lat: 28.6, lng: 77.2 });
    
    expect(result.spots).toEqual([]);
    expect(result.fromCache).toBe(false);
    expect(api.isFetching).toBe(false);
  });

  it('parses successful OSM responses correctly', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: 28.61, lon: 77.21, tags: { name: 'Test Mechanic', shop: 'car_repair', phone: '9999999999' } }
        ]
      })
    });

    const result = await api.fetchSpots({ lat: 28.6, lng: 77.2 });
    
    expect(result.spots).toHaveLength(1);
    expect(result.spots[0].name).toBe('Test Mechanic');
    expect(result.spots[0].category).toBe('mechanic');
    expect(result.spots[0].phone).toBe('9999999999');
    expect(result.fromCache).toBe(false);
  });

  it('handles network timeouts/errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    const result = await api.fetchSpots({ lat: 28.6, lng: 77.2 });
    
    expect(result.spots).toEqual([]);
    expect(result.error).toBeDefined();
    expect(api.isFetching).toBe(false);
  });

  it('respects debounce timer to prevent API spam', async () => {
    api.lastFetchTime = Date.now();
    api.isFetching = false;
    
    const result = await api.fetchSpots({ lat: 28.6, lng: 77.2 });
    
    expect(result.spots).toEqual([]);
    expect(result.error).toBe('throttled');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
