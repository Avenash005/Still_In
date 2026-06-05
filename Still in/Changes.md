# Changes.md - Expiry Handling Fixes

## Investigation Summary

### Codebase Audit - Checkpoints (CP)

**CP1 - Backend Auth Middleware (`server/middleware/auth.js`)**

- What status code does it return when the token is expired?
  - Initially returned: 500 Internal Server Error
  - Problem: All errors (including TokenExpiredError) were caught and returned 500
  - Required fix: Return 401 for TokenExpiredError specifically

**CP2 - Voting Logic (`server/routes/poll.js`)**

- Does the vote endpoint correctly prevent duplicate votes?
  - Initial check: `votedUserIds.find(id => id === req.user.email)`
  - Problem: `votedUserIds` stores numeric userId, but check compares with `req.user.email` (string)
  - This type mismatch always returns false, allowing unlimited votes
  - Required fix: Compare userId with userId using Array.includes()

**CP3 - Frontend Axios Client (`client/src/api/client.js`)**

- Is there an Axios response interceptor watching for 401?
  - Initial state: No response interceptor existed
  - Problem: 401 responses would fail silently, no global handling
  - Required fix: Add response interceptor to handle 401 globally

**CP4 - Dashboard Polling (`client/src/pages/Dashboard.jsx`)**

- Is the polling interval cleared when the session ends?
  - Initial state: setInterval runs every 10 seconds indefinitely
  - Problem: No connection to stop polling when 401 is received
  - Required fix: Register interval with client, clear on 401

**CP5 - Network Tab Observation**

- Before fix: Poll requests fire every 10 seconds indefinitely, all returning 500 after expiry
- After fix: Should see exactly one 401, then silence

---

## Fixes Applied

### Fix 1: Backend - Return 401 on Token Expiry

**File:** `server/middleware/auth.js`

**Changes:**
- Added import for `jsonwebtoken` to access error names
- Modified catch block to check if `err.name === "TokenExpiredError"`
- Return 401 Unauthorized with "Token expired" message for expired tokens
- Return 401 for other auth errors (not 500)

**Code:**
```javascript
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../auth/jwt");

const authMiddleware = (req, res, next) => {
  // ... token extraction code ...
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    // Check if the error is specifically a token expiration error
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", error: err.message });
    }
    // Return 401 for other authentication errors
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};
```

---

### Fix 2: Backend - Fix Duplicate Vote Check

**File:** `server/routes/poll.js`

**Changes:**
- Changed duplicate check from `.find(id => id === req.user.email)` to `.includes(userId)`
- Uses correct type comparison (numeric userId vs numeric userId)

**Code:**
```javascript
// FIX: Compare userId with userId (both numeric) instead of with email
const alreadyVoted = votedUserIds.includes(userId);

if (alreadyVoted) {
  return res.status(400).json({ message: "You have already voted!" });
}
```

---

### Fix 3: Frontend - Add 401 Response Interceptor

**File:** `client/src/api/client.js`

**Changes:**
- Added global response interceptor to handle 401 errors
- Clears localStorage token and user on 401
- Redirects to /login page

**Code:**
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Variable to store the active polling interval ID
let activeIntervalId = null;

// Function to set the active interval ID (used by Dashboard to register its interval)
export const setActiveInterval = (intervalId) => {
  activeIntervalId = intervalId;
};

// Request interceptor...

// Response interceptor to handle 401 errors globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear the polling interval if exists
      if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      
      // Clear token and user from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

---

### Fix 4: Frontend - Register Polling Interval

**File:** `client/src/pages/Dashboard.jsx`

**Changes:**
- Import `setActiveInterval` from client
- Register the polling interval when setting it up
- This allows the interceptor to clear it when 401 is received

**Code:**
```javascript
import { setActiveInterval } from '../api/client';

// In useEffect:
useEffect(() => {
  fetchPoll(true);

  // AUTO-REFRESH EVERY 10 SECONDS
  intervalRef.current = setInterval(() => {
    fetchPoll();
  }, 10000);
  
  // Register the interval with the client so it can be cleared on 401
  setActiveInterval(intervalRef.current);

  return () => clearInterval(intervalRef.current);
}, []);
```

---

## Summary

| Issue | Problem | Fix |
|-------|---------|-----|
| 1. Expired Token Returns Wrong HTTP Status | Backend returned 500 for all errors | Return 401 specifically for TokenExpiredError |
| 2. Voting Logic Allows Duplicate Votes | Type mismatch (email vs userId) always returned false | Use `.includes(userId)` for correct comparison |
| 3. Frontend Ignores Authentication Errors | No response interceptor for 401 | Added global interceptor to handle 401 |
| 4. Polling Interval Keeps Running After Expiry | No mechanism to stop polling | Register interval with client, clear on 401 |

---

## Expected Behavior After Fix

**Before Fix (Broken):**
- Token expires at T+60s
- Polling continues every 10s indefinitely
- Backend returns 500
- Frontend doesn't recognize auth failure
- UI shows user as logged in
- User can vote multiple times

**After Fix (Correct):**
- Token expires at T+60s
- Polling fires at T+70s → Backend returns 401
- Interceptor catches 401
- Polling interval is cleared immediately
- User state is cleared from memory
- User is redirected to /login
- No more network requests
- No duplicate votes allowed
