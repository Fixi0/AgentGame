# AgentFoot - Quick Reference Guide

## Game Status: 60% Complete
**Completion breakdown:**
- 95% Game Logic (systems implemented)
- 40% UI Integration (components exist but incomplete)
- 20% FM26 Features (missing squad management, youth academy, analytics)
- 60% Overall (strong foundation, needs finishing)

---

## What Works ✅

### Perfectly Working
- [x] Player attribute system (17 stats)
- [x] Club tier system and player generation
- [x] Agency reputation tracking (4 segments)
- [x] Player roles assignment (Star, Titulaire, Rotation, Indésirable)
- [x] Match scheduling algorithm (seeded round-robin)
- [x] Season progression
- [x] Database persistence (IndexedDB)
- [x] Player detail modal display

### Mostly Working
- [x] Match result generation
- [x] Event message system
- [x] Contract creation flow
- [x] Transfer engine logic
- [x] Recruitment pitch system
- [x] Calendar events
- [x] Player statistics

---

## What's Broken 🔧

### Critical Issues
1. **Players missing clubRole initially** → Fixed in code, needs verification
2. **Match results don't update Dashboard** → Need to check persistence
3. **Contract negotiation UI incomplete** → Modal sequence broken
4. **Dashboard shows stale data** → React state sync issue

### High Priority Issues
5. Scouting system is just a stub (no actual scouting)
6. News feed generates no content
7. Transfer market very basic (no fees calculated)
8. Recruitment pitch UI unclear

### Medium Priority Issues
9. No loading states in modals
10. Mobile responsiveness not tested
11. Error messages missing
12. No accessibility features

---

## What's Missing ❌

### Critical Missing (Must Have for FM26)
- [ ] Squad formation UI (no team lineup selector)
- [ ] Player development tracking (no growth projection)
- [ ] Youth academy system (no youth team)
- [ ] Financial dashboard (no budget allocation UI)

### Important Missing (Should Have)
- [ ] Transfer window mechanics (no deadline)
- [ ] Player wellness/fatigue tracking UI
- [ ] Performance analytics dashboard
- [ ] Sponsorship system

### Nice to Have (Could Add Later)
- [ ] Social features (no friend league)
- [ ] Advanced scout reports
- [ ] AI assistant suggestions
- [ ] Replay/highlight system

---

## File Organization

### Key Files (Know These!)

#### Core Game
- **App.jsx** (85KB) - Main app, player loading, database init
- **localDatabase.js** - IndexedDB operations, club role assignment
- **squadDatabase.js** - Player generation with intelligence

#### Biggest Systems (Most Complex)
- **messageSystem.js** (894 lines) - Event definitions & consequences
- **matchSystem.js** (515 lines) - Match scheduling & simulation
- **clubFinanceSystem.js** - Budget & spending logic
- **advancedContractSystem.js** - Contract negotiation
- **europeanCupSystem.js** - European cup brackets
- **recruitmentSystem.js** - Recruitment pitch matching
- **worldCupSystem.js** - International competitions

#### Main Views
- **Dashboard.jsx** (52KB) - Main dashboard (needs updating)
- **PlayerDetailModal.jsx** - Player full view (has all tabs)
- **Office.jsx** - Agent office
- **Roster.jsx** - Player list
- **Market.jsx** - Free agent market
- **Standings.jsx** - League standings
- **ContractDashboard.jsx** - Contract management

#### Modals (Interactive Features)
- **OfferContractModal.jsx** - Make offers
- **NegotiationModals.jsx** - Negotiate deals
- **TransferOfferModal.jsx** - Handle transfers
- **RecruitmentModal.jsx** - Pitch players
- **PlayerDetailModal.jsx** - View player details

#### Small but Important
- **attributesSystem.js** - 17-stat definition & rating
- **agencyReputationSystem.js** - Reputation segments
- **playerDevelopmentSystem.js** - Too small (62 lines)
- **injurySystem.js** - Injury mechanics

---

## Data Flow Diagram

```
App Start
  ↓
Load Clubs (clubs.js)
  ↓
Load Players from IndexedDB (localDatabase.js)
  ↓
Assign clubRole to each player (assignIntelligentClubRole)
  ↓
Build active game state
  ↓
Render Dashboard
  ↓
User actions → Modal/Component
  ↓
Game logic execution (gameLogic.js)
  ↓
Save to IndexedDB
  ↓
Update UI with new state
```

---

## Critical Code Snippets

### How clubRole is Assigned
```javascript
// In localDatabase.js
const assignIntelligentClubRole = (player) => {
  // Gets peers on same club
  // Calculates player percentile within club
  // Top 15% = Star
  // 15-35% = Titulaire
  // 35-85% = Rotation
  // Bottom 15% = Indésirable
}
```

### How Matches Generate Results
```javascript
// In matchSystem.js
const calculateMatchResult = (homeTeam, awayTeam) => {
  // Get team strength (tier-based)
  // Modify by player attributes
  // Generate seeded random result
  // Return goals for each team
}
```

### How Reputation Changes
```javascript
// In agencyReputationSystem.js
// 4 segments: sportif, business, media, ethique
// Each 0-100
// Events change segments based on type
// Total reputation = sum of segments
```

---

## Quick Debugging Guide

### Player Showing "Non Défini" for Role
**Check:**
1. Open DevTools → Application → IndexedDB
2. Find player record, look for `club_role` field
3. If missing, run migration:
   ```javascript
   // In console:
   db.ensurePlayersHaveClubRole()
   ```
4. Refresh page

### Match Results Not Showing
**Check:**
1. Dashboard → Upcoming matches → click a completed match
2. Check if result displays
3. If not, check console for errors
4. Verify matchSystem.js is updating player stats

### Contract Not Saving
**Check:**
1. Open contract modal, make offer
2. Complete negotiation
3. Check IndexedDB for contract in player record
4. Check console for any errors

### Database Issues
**Clear & Reset:**
```javascript
// In DevTools console:
indexedDB.deleteDatabase('agent_foot_local_db')
// Then refresh page
```

---

## Next Actions (Priority Order)

### Today (4 hours)
1. [ ] **Verify clubRole works**
   - Open app, check 3 players in modal
   - All should show Star/Titulaire/Rotation/Indésirable (not "non défini")
   - If any show undefined, see debugging guide above

### This Week (20 hours)
2. [ ] **Test match system end-to-end**
   - Play a match, check result, verify Dashboard updates
   
3. [ ] **Complete contract flow**
   - Offer contract, negotiate, sign, verify it saves
   
4. [ ] **Fix Dashboard updates**
   - Make a roster change, watch Dashboard refresh

### Next Week (40 hours)
5. [ ] **Implement scouting**
   - Current: Just a stub component
   - Need: Scout hiring, player discovery, reports
   
6. [ ] **Complete recruitment UI**
   - Show all 4 pitch types
   - Wire selection → player acceptance
   
7. [ ] **Fix transfer system**
   - Calculate fees, show UI, handle negotiation

### Following Week (40 hours)
8. [ ] **Build squad management**
   - Squad formation UI
   - Position assignments
   - Tactical formations
   
9. [ ] **Add player development**
   - Growth projection
   - Potential tracking
   
10. [ ] **Financial dashboard**
    - Budget allocation
    - Salary tracking

---

## Team Structure Reference

### File Size Leaders
1. App.jsx (85KB) - **TOO LARGE** (split into 3-4 files)
2. Dashboard.jsx (52KB) - **TOO LARGE** (split into sections)
3. messageSystem.js (894 lines) - **TOO LONG** (reorganize)
4. PlayerAttributesPanel.jsx (5.7KB) - **GOOD SIZE**
5. styles.js (45KB) - **OK** (centralized is fine)

### System Files Count: 40
**By category:**
- Reputation: 5 files (reputation, agency, league, segment, etc.)
- Match: 3 files (match, European cup, World cup)
- Transfer: 3 files (recruitment, advanced contract, transfer engine)
- Player: 4 files (attributes, development, injuries, playing time)
- Events: 5 files (event, message, living event, week narrative, consequence)
- Agency: 4 files (agency, goals, staff, contacts)
- Other: 16+ files (coherence, dossier, club, season, etc.)

### Component Files Count: 28
**By type:**
- Main views: 8 files (Dashboard, Office, Roster, Market, etc.)
- Modals: 14 files (all interactive features)
- Shared: 6 files (styles, error boundary, components)

---

## Performance Baseline

### Current Issues
- App.jsx: 85KB (should be <50KB)
- Dashboard.jsx: 52KB (should be <30KB)
- Initial load: Unknown (should measure)
- Modal load: Unknown (should measure)

### Optimization Targets
- [ ] Code split by feature (lazy load modals)
- [ ] Memoize expensive calculations
- [ ] Lazy load images/assets
- [ ] Optimize database queries (add indexes)
- [ ] Reduce component re-renders (use useMemo/useCallback)

---

## Testing Checklist

Before marking any feature "DONE":

- [ ] Works on fresh database
- [ ] Works on existing saves
- [ ] No console errors
- [ ] Mobile (375px) responsive
- [ ] No data loss on refresh
- [ ] Loading states show
- [ ] Error states handled
- [ ] Modal completes successfully

---

## Communication Guide

### For Your Team
- "We're 60% done overall"
- "Game logic is 95% complete, UI is 40% integrated"
- "Critical path is fixing 4 bugs, then 10 missing features"
- "4 weeks to full FM26 parity"

### For Players/Testers
- "Game is in closed alpha"
- "You can manage players, sign contracts, play matches"
- "Some features like squad formation coming soon"
- "Please report any clubRole showing as undefined"

### Red Flags to Watch
- ⚠️ Any "non défini" values → Bug
- ⚠️ Modal that doesn't complete → Incomplete flow
- ⚠️ Dashboard not updating → State sync issue
- ⚠️ Match results not saving → Persistence issue
- ⚠️ Contract not in player record → Logic broken
- ⚠️ Console errors → Code issue

---

## Terminology

### Game Terms
- **Club Tier:** Ranking of club (T1=top, T4=bottom)
- **Club Role:** Player's role at club (Star/Titulaire/Rotation/Indésirable)
- **Rating:** Player's current ability (0-100)
- **Potential:** Max rating player can reach (0-100)
- **Attributes:** 17 individual stats (0-20 each)
- **Reputation:** Agency's standing (0-1000)
- **Credibility:** Personal credibility with clubs (0-100)

### Technical Terms
- **IndexedDB:** Browser database used for saves
- **Seeded RNG:** Random but reproducible (same seed = same result)
- **Round Robin:** Each team plays each other twice (home/away)
- **Percentile:** Position in ranking (e.g., 75th percentile = top 25%)
- **Modal:** Pop-up dialog for user interaction
- **Persistence:** Saving data so it survives app restart
- **Migration:** Updating database schema safely

---

## Resources

### Files to Read First (in order)
1. This file (you're reading it!) ← Start here
2. AUDIT_REPORT.md (detailed analysis) ← For deep dive
3. DEVELOPMENT_ROADMAP.md (action plan) ← For what to do

### Files to Study (by importance)
1. App.jsx - Where everything starts
2. squadDatabase.js - How players are made
3. localDatabase.js - How data is saved
4. matchSystem.js - How matches work
5. advancedContractSystem.js - How contracts work
6. messageSystem.js - What events exist

### Tools Needed
- Browser (Chrome/Firefox with DevTools)
- Text editor (VS Code)
- Git for version control
- Terminal for running commands

---

**Status:** 🟡 In Planning Phase  
**Next Review:** Weekly  
**Owner:** You (the developer)  
**Last Updated:** April 21, 2026
