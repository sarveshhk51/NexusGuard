/**
 * NexusGuard API Configuration.
 * Handles environment-aware URL resolution for local Vite proxy and production Vercel/Render deployments.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (
  typeof window !== 'undefined'
    ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.host) + '/ws'
    : 'ws://127.0.0.1:8000/ws'
);

export function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
