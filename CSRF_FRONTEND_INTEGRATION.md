# CSRF Protection - Frontend Integration Guide

## Overview
CSRF (Cross-Site Request Forgery) protection is active on all state-changing endpoints (POST, PUT, DELETE, PATCH), **except public authentication endpoints** (register, login, refresh). The backend generates a unique token per session and validates it on every non-safe, non-public request.

## Public Endpoints (CSRF Exempt)
These endpoints do **not** require a CSRF token:
- `POST /api/auth/register` - Creates new user (session creation, not modification)
- `POST /api/auth/login` - Authenticates user (session creation, not modification)
- `POST /api/auth/refresh` - Refreshes access token (public token exchange)

All other POST/PUT/DELETE/PATCH endpoints **require** CSRF token validation.

## How It Works
1. Backend generates a CSRF token and stores it in the session when middleware runs
2. Token is sent to frontend via `X-CSRF-Token` response header
3. Frontend stores the token and includes it in `X-CSRF-Token` request header for all POST/PUT/DELETE/PATCH requests (except public auth endpoints)
4. Token is rotated after login; frontend must fetch the new token from login response

## Frontend Implementation

### 1. Fetch Initial CSRF Token
Make a GET request to any protected endpoint to receive the token in the response header:

```javascript
// Example: Fetch CSRF token on app init
async function fetchCsrfToken() {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      credentials: 'include', // Important: include session cookie
    });
    
    const csrfToken = response.headers.get('X-CSRF-Token');
    if (csrfToken) {
      // Store in memory (not localStorage for security)
      window.csrfToken = csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
}

// Call on app initialization
await fetchCsrfToken();
```

### 2. Include Token in State-Changing Requests
Add the `X-CSRF-Token` header to all POST/PUT/DELETE/PATCH requests:

```javascript
// Example: Making a protected POST request
async function deleteData() {
  try {
    const response = await fetch('/api/data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': window.csrfToken, // Include CSRF token
      },
      credentials: 'include', // Include session cookie
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'CSRF_MISSING' || error.code === 'CSRF_INVALID') {
        // Token invalid or expired; refetch and retry
        await fetchCsrfToken();
        // Optionally retry the request
      }
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}
```

### 3. Handle Token Rotation After Login
After successful login, the backend rotates the CSRF token. The new token is included in the login response:

```javascript
// Example: Login and store new CSRF token
async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No CSRF token needed for login (public endpoint)
      },
      credentials: 'include',
      body: JSON.stringify({ identifier: email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Store new CSRF token from response
    if (data.data.csrfToken) {
      window.csrfToken = data.data.csrfToken;
    }
    
    // Store access token
    localStorage.setItem('accessToken', data.data.accessToken);
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### 4. Create a Reusable API Client
Recommended: wrap fetch in a helper that automatically includes CSRF token:

```javascript
// api.js - Centralized API client
let csrfToken = null;

// Fetch and cache CSRF token
export async function initCsrf() {
  const response = await fetch('/api/health', {
    credentials: 'include',
  });
  csrfToken = response.headers.get('X-CSRF-Token');
}

// Generic API request wrapper
export async function apiRequest(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options;

  // Include CSRF token for state-changing requests
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  if (needsCsrf && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Include access token if available
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle CSRF errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.code === 'CSRF_INVALID' || error.code === 'CSRF_MISSING') {
      // Refetch token and optionally retry
      await initCsrf();
    }
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Update CSRF token if present in response
  const newCsrfToken = response.headers.get('X-CSRF-Token');
  if (newCsrfToken) {
    csrfToken = newCsrfToken;
  }

  return response.json().catch(() => null);
}

// Usage examples:
// await apiRequest('/api/data', { method: 'DELETE' });
// await apiRequest('/api/games', { method: 'POST', body: { name: 'Game1' } });
```

### 5. Handle Token Expiration
If session expires or token becomes invalid, the backend returns 403 with `CSRF_INVALID` or `CSRF_SESSION_MISSING`:

```javascript
// Error handling in your API client
if (response.status === 403) {
  const error = await response.json();
  if (error.code === 'CSRF_SESSION_MISSING') {
    // Session expired; redirect to login
    window.location.href = '/login';
  } else if (error.code === 'CSRF_INVALID') {
    // Token mismatch; refetch and retry
    await initCsrf();
    // Optionally retry the request once
  }
}
```

## Security Best Practices

### DO:
- ✅ Store CSRF token in memory (window variable or React state)
- ✅ Include `credentials: 'include'` in all fetch requests to send session cookie
- ✅ Fetch new token after login/logout
- ✅ Handle CSRF errors gracefully (refetch token, prompt user)
- ✅ Use HTTPS in production to protect session cookies

### DON'T:
- ❌ Store CSRF token in localStorage (vulnerable to XSS)
- ❌ Send CSRF token as query parameter (vulnerable to logs/history)
- ❌ Reuse expired tokens (backend will reject)
- ❌ Omit `credentials: 'include'` (session won't be sent)

## Common Issues

### Issue: "CSRF token missing"
**Cause:** Frontend didn't include `X-CSRF-Token` header in request.  
**Fix:** Ensure header is added to all POST/PUT/DELETE/PATCH requests.

### Issue: "Invalid CSRF token"
**Cause:** Token mismatch between client and server (session expired, token not updated after login).  
**Fix:** Refetch token from backend (make a GET request or check response headers).

### Issue: "CSRF token not found in session"
**Cause:** Session cookie missing or expired.  
**Fix:** Redirect user to login; session must be reestablished.

### Issue: Token works locally but fails in production
**Cause:** CORS or session cookie configuration issue.  
**Fix:** 
- Ensure backend CORS allows your frontend origin with `credentials: true`
- Set `cookie.secure = true` and `cookie.sameSite = 'strict'` in production
- Use HTTPS for both frontend and backend

## Testing CSRF Protection

### Test Valid Token Flow
```bash
# 1. Start a session and get CSRF token
curl -c cookies.txt -v http://localhost:4000/api/health

# Extract X-CSRF-Token from response headers (example: abc123...)

# 2. Use token in a POST request
curl -b cookies.txt -X POST http://localhost:4000/api/data \\
  -H "Content-Type: application/json" \\
  -H "X-CSRF-Token: abc123..." \\
  -d '{"key":"value"}'
```

### Test Missing Token (should fail with 403)
```bash
curl -b cookies.txt -X POST http://localhost:4000/api/data \\
  -H "Content-Type: application/json" \\
  -d '{"key":"value"}'
# Expected: {"success":false,"message":"CSRF token missing","code":"CSRF_MISSING"}
```

### Test Invalid Token (should fail with 403)
```bash
curl -b cookies.txt -X POST http://localhost:4000/api/data \\
  -H "Content-Type: application/json" \\
  -H "X-CSRF-Token: invalid-token-here" \\
  -d '{"key":"value"}'
# Expected: {"success":false,"message":"Invalid CSRF token","code":"CSRF_INVALID"}
```

## Implementation Checklist
- [ ] Initialize CSRF token on app load
- [ ] Include `X-CSRF-Token` header in all POST/PUT/DELETE/PATCH requests
- [ ] Update token after login from response
- [ ] Handle CSRF errors (403) by refetching token
- [ ] Use `credentials: 'include'` in all requests
- [ ] Store token in memory (not localStorage)
- [ ] Test with valid, missing, and invalid tokens
- [ ] Verify CORS and session cookie settings for production

## Additional Resources
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Fetch API with credentials](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#sending_a_request_with_credentials_included)
- [Express Session Documentation](https://github.com/expressjs/session)
