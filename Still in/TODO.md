# TODO - Expiry Handling Fixes

## Issues to Fix

- [x] Issue 1: Backend returns 500 on expired token
- [x] Issue 2: Voting logic allows duplicate votes
- [x] Issue 3: Frontend has no global interceptor for 401 responses
- [x] Issue 4: Polling interval continues after token expiry

## Implementation Steps

- [x] Fix 1: Update server/middleware/auth.js to return 401 for TokenExpiredError
- [x] Fix 2: Update server/routes/poll.js to compare userId with userId (not email)
- [x] Fix 3: Add 401 response interceptor in client/src/api/client.js
- [x] Fix 4: Connect interceptor to stop polling in Dashboard.jsx
