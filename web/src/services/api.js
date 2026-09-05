import { auth } from './firebase.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Gets Firebase Auth ID Token for currently authenticated user.
 * Ensures Firebase auth state is ready before reading currentUser to prevent
 * premature unauthenticated requests on page refresh.
 */
async function getAuthToken(forceRefresh = false) {
  if (!auth) {
    throw new Error('Firebase authentication is not initialized. Please verify configuration.');
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }

  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken(forceRefresh);
    } catch (e) {
      console.error('[API] getIdToken failed:', e.message);
      throw new Error('Failed to retrieve authentication token: ' + e.message);
    }
  }
  throw new Error('User is not authenticated. Please sign in.');
}

/**
 * Core HTTP Request Wrapper with reliable Firebase token authentication
 * and automatic transparent token refresh retry on 401.
 */
export async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  let token;
  try {
    token = await getAuthToken(false);
  } catch (err) {
    console.warn(`[API] Unauthenticated request to ${endpoint}:`, err.message);
    throw err;
  }

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  if (!isFormData && data) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ message: response.statusText }));
      
      // If 401 Unauthorized occurs, attempt a single token force-refresh & retry
      if (response.status === 401 && auth.currentUser) {
        console.log('[API] Token expired or invalid. Force-refreshing token and retrying...');
        try {
          const freshToken = await getAuthToken(true);
          options.headers['Authorization'] = `Bearer ${freshToken}`;
          
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, options);
          if (!retryResponse.ok) {
            const retryErr = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }));
            if (retryResponse.status === 401) {
              throw new Error('Your session expired. Please sign in again.');
            }
            throw new Error(retryErr.message || `API Error ${retryResponse.status}`);
          }
          return await retryResponse.json();
        } catch (retryError) {
          console.error('[API] Retry after token refresh failed:', retryError.message);
          throw retryError;
        }
      }

      if (response.status === 401) {
        throw new Error('Your session expired. Please sign in again.');
      }

      throw new Error(errBody.message || `API Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API] ${method} ${endpoint} failed:`, error.message);
    throw error;
  }
}

// User & Profile Endpoints
export const getUserProfile = () => apiRequest('/user/profile', 'GET');
export const saveOnboarding = (data) => apiRequest('/user/onboarding', 'POST', data);
export const updateUserSettings = (data) => apiRequest('/user/settings', 'PUT', data);
export const deleteUserAccount = () => apiRequest('/user/account', 'DELETE');

// Journal Endpoints
export const submitQuickCheckin = (data) => apiRequest('/journal/checkin', 'POST', data);
export const getJournalEntry = (dateStr) => apiRequest(`/journal/entry/${dateStr}`, 'GET');
export const getJournalEntriesList = () => apiRequest('/journal/entries', 'GET');
export const updateJournalEntry = (entryId, data) => apiRequest(`/journal/entry/${entryId}`, 'PUT', data);
export const submitRetroactiveEntry = (data) => apiRequest('/journal/retroactive', 'POST', data);

// Gemini / Reflectra Endpoints
export const sendGeminiChatTurn = (data) => apiRequest('/gemini/chat', 'POST', data);
export const summarizeChatSession = (data) => apiRequest('/gemini/summarize-session', 'POST', data);
export const transcribeAudioUpload = (formData) => apiRequest('/gemini/transcribe', 'POST', formData, true);
export const captionPhotoMemory = (formData) => apiRequest('/gemini/caption', 'POST', formData, true);

// Analytics / Insights Endpoints
export const getMonthlyReport = (monthId, force = false) => apiRequest(`/analytics/monthly/${monthId}${force ? '?force=true' : ''}`, 'GET');

// Notification Endpoints
export const checkMissedDays = () => apiRequest('/notifications/check-missed', 'GET');
export const registerNotificationToken = (fcmToken) => apiRequest('/notifications/register-token', 'POST', { fcmToken });
