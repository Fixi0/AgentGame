# Immediate Actions - First 24 Hours

## Priority 1: Verify Critical Fixes (Today - 4 hours)

### Action 1: Check if clubRole Assignment Works
**Time:** 30 minutes

1. **Start the app fresh**
   ```bash
   # Make sure app is running on localhost
   # If not, run: npm run dev
   ```

2. **Open Browser DevTools (F12)**
   - Go to Application tab
   - Find IndexedDB → agent_foot_local_db
   - Open "players" table
   - Click on any player record

3. **Verify the Fix**
   - Look for `club_role` field in record
   - Should show: "Star" OR "Titulaire" OR "Rotation" OR "Indésirable"
   - If shows `null` or `undefined` → **BUG, needs fix**

4. **Test in UI**
   - Click on any player in Dashboard
   - Open PlayerDetailModal
   - Check the player's role displays correctly
   - Test 5 different players
   - All should show a role (not "Non défini")

**Result:**
- ✅ **PASS:** All players show their role correctly
- ❌ **FAIL:** Some show undefined → Need to debug assignIntelligentClubRole

---

### Action 2: Check if Match Results Persist
**Time:** 45 minutes

1. **Create Test Data**
   - Go to Dashboard
   - Note upcoming matches
   - Note a player's current rating (in PlayerDetailModal)

2. **Play a Week**
   - Advance calendar to next week
   - Check if matches completed
   - Open match result modal
   - Verify goals and winner show

3. **Check Persistence**
   - Go to player detail modal
   - Check if rating changed after match
   - Go to Dashboard, look at match history
   - Should show last 5 matches played

**Result:**
- ✅ **PASS:** Match results show, player stats updated, Dashboard shows matches
- ❌ **FAIL:** Results don't show OR ratings don't change → Need to debug matchSystem

---

### Action 3: Test Contract Flow End-to-End
**Time:** 45 minutes

1. **Create a Contract Offer**
   - Open a free agent player (Market.jsx)
   - Click "Offer Contract"
   - Set: Salary 50,000/year, Duration 3 years
   - Submit offer

2. **Negotiate**
   - Should see negotiation screen
   - Player should counter or accept
   - Try to negotiate to agreement
   - Click "Sign"

3. **Verify Save**
   - Player should join your roster
   - Open player detail modal
   - Check "Contract" tab shows terms
   - Go to IndexedDB → verify player record has contract

**Result:**
- ✅ **PASS:** Contract created, negotiated, signed, saved to DB
- ⚠️ **PARTIAL:** Some steps work but negotiation doesn't complete
- ❌ **FAIL:** Modal closes without signing OR contract not saved

---

### Action 4: Check Dashboard Updates in Real-Time
**Time:** 30 minutes

1. **Make a Change**
   - Sign a new player (use contract flow above)
   - Return to Dashboard

2. **Verify Update**
   - New player should appear in roster section
   - Should NOT need to refresh page
   - Finances should update (balance decrease)
   - No old data should show

3. **Test Multiple Changes**
   - Sign 2 players
   - Offer contract to another
   - Dashboard should update each time

**Result:**
- ✅ **PASS:** Dashboard updates instantly on actions
- ⚠️ **PARTIAL:** Updates work after refresh or delay
- ❌ **FAIL:** Changes don't appear on Dashboard until refresh

---

## Priority 2: Document Issues Found (Next 2 hours)

### Create ISSUES.md File
```bash
# Create file at: /Users/victoriapenco/Downloads/AgentFoot/ISSUES.md
```

**Document each issue in this format:**

```markdown
## Issue #1: [Title]
**Severity:** Critical / High / Medium / Low  
**Component:** File name  
**Reproduction:**
1. Step 1
2. Step 2
3. Expected result vs actual result

**Files Affected:**
- src/file1.js
- src/file2.jsx

**Solution:** (if known)
```

**Copy this template for each finding:**

---

## Priority 3: Create Test Plan (Last 2 hours)

### Critical Path Testing

Create file: `TEST_PLAN.md`

```markdown
# Critical Path Tests

## Test 1: Player Role Assignment
- [ ] Player A shows Star role
- [ ] Player B shows Titulaire role  
- [ ] Player C shows Rotation role
- [ ] Player D shows Indésirable role
- [ ] No player shows "Non défini"
- [ ] Roles persist after refresh
- [ ] Roles update after roster changes

## Test 2: Match Execution
- [ ] Match scheduled correctly
- [ ] Match result generates
- [ ] Result shows in Dashboard
- [ ] Player stats update
- [ ] Rating changes reflect in player detail
- [ ] Match history shows last 5 matches

## Test 3: Contract Flow
- [ ] Offer created without errors
- [ ] Player counter-offer shows
- [ ] Negotiation completes
- [ ] Contract saved to player record
- [ ] Player added to roster
- [ ] Finance balance decreases

## Test 4: Dashboard Updates
- [ ] Roster shows all players
- [ ] Matches show upcoming fixtures
- [ ] Objectives show progress
- [ ] Finances show current balance
- [ ] Updates happen without refresh
- [ ] No stale data displays
```

---

## Testing Checklist

### Browser Console Checks
Run these in DevTools Console (F12):

```javascript
// Check if players have clubRole
db.table('players').toArray().then(players => {
  const missingRole = players.filter(p => !p.club_role);
  console.log(`Players missing role: ${missingRole.length}`);
  console.log(missingRole);
});

// Check contract data
db.table('players').toArray().then(players => {
  const withContract = players.filter(p => p.agentContract);
  console.log(`Players with contracts: ${withContract.length}`);
});

// Check match history
db.table('gameState').toArray().then(state => {
  console.log('Recent matches:', state[0]?.recentMatches?.slice(0, 5));
});
```

---

## Bug Report Template

If you find a bug, document it like this:

```
**BUG:** [Short description]
**Severity:** [Critical/High/Medium/Low]
**Reproduced on:** [Device/Browser]
**Steps to Reproduce:**
1. ...
2. ...
3. Expected: ...
   Actual: ...

**Logs/Errors:**
[Paste any console errors here]

**Suggested Fix:**
[If you know how to fix it]

**Related Files:**
- src/file1.js (line X)
- src/file2.jsx (line Y)
```

---

## Success Criteria

### Must Pass (Blocking)
- [ ] No player shows "Non défini" for role
- [ ] Match results generate and show
- [ ] Contracts can be created and signed
- [ ] Dashboard updates when roster changes
- [ ] No critical console errors

### Should Pass (Important)
- [ ] Player development shows growth
- [ ] Recruitment pitch can be offered
- [ ] Transfer offers work
- [ ] Financial data is accurate
- [ ] Calendar shows events

### Nice to Pass (Polish)
- [ ] News feed shows events
- [ ] Scouting discovers players
- [ ] Media relations track changes
- [ ] Objectives complete
- [ ] Notifications appear

---

## If Something's Broken

### Debugging Steps
1. **Check Browser Console**
   - F12 → Console tab
   - Look for red error messages
   - Screenshot them

2. **Check IndexedDB**
   - F12 → Application tab
   - Find agent_foot_local_db
   - Look at relevant table
   - Check if data exists and looks right

3. **Check Network**
   - F12 → Network tab
   - Look for red (failed) requests
   - Check response status codes

4. **Try Fresh Database**
   - In Console:
     ```javascript
     indexedDB.deleteDatabase('agent_foot_local_db')
     ```
   - Refresh page
   - See if problem reproduces

### When to Ask for Help
- If you see console errors you don't understand
- If database is empty/corrupt
- If a modal doesn't complete
- If data doesn't save
- If performance is terrible

---

## Files to Watch

### Most Likely to Have Issues
1. **localDatabase.js** - Database operations
2. **matchSystem.js** - Match logic
3. **advancedContractSystem.js** - Contract negotiation
4. **App.jsx** - Initialization
5. **Dashboard.jsx** - State updates

### Second Tier
6. **gameLogic.js** - Game operations
7. **messageSystem.js** - Events
8. **PlayerDetailModal.jsx** - Display logic
9. **recruitmentSystem.js** - Recruitment
10. **transferEngine.js** - Transfers

---

## Quick Fixes to Try

### Player showing "Non défini"
Try this in console:
```javascript
// Re-run migration
window.db.ensurePlayersHaveClubRole().then(() => {
  console.log('Migration complete, refresh page');
});
```

### Data not persisting
Try this:
```javascript
// Check if database is open
console.log(window.db);

// If undefined, app may not be initialized
// Wait 5 seconds and try again
```

### Modal not closing
Try this:
```javascript
// Check for errors
// Look for preventDefault() that might block closing
// Check modal onComplete callback
```

### Data showing old values
Try this:
```javascript
// Force refresh from database
location.reload(true);  // Hard refresh

// Or clear cache
localStorage.clear();
```

---

## Success Messages to Look For

### When ClubRole Fixed
```
✅ All players have clubRole assigned
✅ Star players showing correctly
✅ Indésirable showing correctly
✅ Percentiles calculated right
```

### When Matches Work
```
✅ Match results generate
✅ Player stats update
✅ Dashboard shows completed matches
✅ Rating changes display
```

### When Contracts Work
```
✅ Offer created successfully
✅ Player responded to offer
✅ Contract negotiated
✅ Contract saved to player
✅ Player added to roster
```

### When Dashboard Works
```
✅ Roster updates instantly
✅ Matches show correctly
✅ Finances accurate
✅ No stale data
✅ All sections populated
```

---

## Time Breakdown

- **Test 1 (clubRole):** 30 min
- **Test 2 (matches):** 45 min
- **Test 3 (contracts):** 45 min
- **Test 4 (Dashboard):** 30 min
- **Document issues:** 60 min
- **Create test plan:** 30 min

**Total:** 4.5 hours (leave 30 min buffer)

---

## What to Report Back

After completing this 24-hour check, report:

1. **What works:**
   - ✅ All players have club roles
   - ✅ Matches generate results
   - ✅ Contracts can be signed
   - ✅ Dashboard updates in real-time

2. **What's broken:**
   - ❌ Issue A: [Description]
   - ❌ Issue B: [Description]
   - ⚠️ Issue C: [Works partially]

3. **What needs attention:**
   - Priority 1: Fix Issue A (blocking)
   - Priority 2: Fix Issue B (important)
   - Priority 3: Improve Issue C (nice-to-have)

4. **Recommendations:**
   - Start with: [Most critical issue]
   - Then: [Second issue]
   - Finally: [Polish issue]

---

**Start Time:** [Your timestamp]  
**Status:** 🟢 Ready to Begin  
**Estimated Completion:** 4 hours  
**Deadline:** End of today
