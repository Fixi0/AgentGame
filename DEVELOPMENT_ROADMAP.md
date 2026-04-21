# AgentFoot Development Roadmap
## Quick Action Plan & Feature Prioritization

---

## Scoring Matrix: Effort vs Impact

### Quadrant 1: High Impact, Low Effort (DO FIRST)
These are quick wins that unlock major functionality.

| Feature | Effort | Impact | Est. Time | Files |
|---------|--------|--------|-----------|-------|
| **Verify clubRole Assignment** | 🟢 Low | 🔴 Critical | 2-4 hours | App.jsx, PlayerDetailModal.jsx, localDatabase.js |
| **Fix Match Results Persistence** | 🟡 Medium | 🔴 Critical | 4-6 hours | matchSystem.js, Dashboard.jsx, gameLogic.js |
| **Complete Contract Flow UI** | 🟡 Medium | 🔴 Critical | 6-8 hours | OfferContractModal.jsx, NegotiationModals.jsx, advancedContractSystem.js |
| **Fix Dashboard Real-Time Updates** | 🟡 Medium | 🟠 High | 4-5 hours | Dashboard.jsx, App.jsx |
| **Implement Scouting System** | 🟠 High | 🟡 Medium | 8-10 hours | scouting.jsx, squadDatabase.js |
| **Complete News Generation** | 🟡 Medium | 🟡 Medium | 5-6 hours | newsSystem.js, NewsFeed.jsx, messageSystem.js |

### Quadrant 2: High Impact, High Effort (PLAN CAREFULLY)
Large features that move the needle. Phase 2+ priority.

| Feature | Effort | Impact | Est. Time | Files |
|---------|--------|--------|-----------|-------|
| **Squad Management UI** | 🔴 High | 🔴 Critical | 16-20 hours | New: SquadFormation.jsx, TacticalBoard.jsx improvements |
| **Player Development Tracking** | 🔴 High | 🟠 High | 12-15 hours | playerDevelopmentSystem.js, new PlayerDevelopment.jsx |
| **Transfer Market System** | 🔴 High | 🟠 High | 12-16 hours | transferEngine.js, Market.jsx, marketSystem.js (new) |
| **Youth Academy System** | 🔴 High | 🟠 High | 14-18 hours | new YouthAcademy.jsx, youth management system |
| **Financial Dashboard** | 🟡 Medium | 🟡 Medium | 10-12 hours | clubFinanceSystem.js, new Finance.jsx |
| **Analytics Dashboard** | 🔴 High | 🟡 Medium | 14-18 hours | new Analytics.jsx, data aggregation |

### Quadrant 3: Low Impact, Low Effort (NICE TO HAVE)
Polish items, UX improvements.

| Feature | Effort | Impact | Est. Time |
|---------|--------|--------|-----------|
| **Add Toast Notifications** | 🟢 Low | 🟢 Low | 2-3 hours |
| **Improve Loading States** | 🟢 Low | 🟢 Low | 3-4 hours |
| **Add ARIA Labels** | 🟡 Medium | 🟢 Low | 6-8 hours |
| **Mobile Responsiveness Audit** | 🟡 Medium | 🟢 Low | 8-10 hours |
| **Button Consistency Pass** | 🟢 Low | 🟢 Low | 3-4 hours |

### Quadrant 4: Low Impact, High Effort (DEPRIORITIZE)
Features that are nice but not critical.

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| **Social Media Integration** | 🔴 High | 🟢 Low | Skip for now |
| **Advanced Analytics Predictions** | 🔴 High | 🟢 Low | Post-launch |
| **AI Scout Recommendations** | 🔴 High | 🟢 Low | Phase 3+ |
| **Complex Sponsorship System** | 🔴 High | 🟡 Medium | Post-launch |

---

## 30-Day Sprint Plan

### Week 1: Critical Foundation
**Goal:** Get core game loops working end-to-end

**Monday-Tuesday (8 hours)**
- [ ] Verify clubRole assignment works for all players
- [ ] Test player display in modals shows correct role
- [ ] Run migration on test database
- **Deliverable:** All roster players display with correct clubRole

**Wednesday-Thursday (8 hours)**
- [ ] Debug match results persistence
- [ ] Ensure match stats update player attributes
- [ ] Wire match results to Dashboard display
- **Deliverable:** Match→result→stats flow complete

**Friday (4 hours)**
- [ ] Test complete contract flow: offer → negotiation → signature
- [ ] Fix any modal sequence issues
- [ ] **Deliverable:** Contract signing works end-to-end

**Sprint 1 Review:**
- [ ] Player roles displaying correctly
- [ ] Matches generating results and updating stats
- [ ] Contracts can be signed and stored
- **Blockers identified?** Document in ISSUES.md

---

### Week 2: Complete Half-Baked Features
**Goal:** Finish recruitment, transfer, and negotiation systems

**Monday-Wednesday (12 hours)**
- [ ] Complete recruitment pitch UI (4 pitch types visible)
- [ ] Wire pitch selection → player acceptance/rejection
- [ ] Add player response feedback
- **Deliverable:** Full recruitment flow working

**Thursday-Friday (8 hours)**
- [ ] Complete transfer offer UI flow
- [ ] Implement player consent mechanism
- [ ] Calculate and display transfer fees
- **Deliverable:** Transfer system functional

**Parallel (8 hours)**
- [ ] Wire scouting: scout hiring → player discovery → report
- [ ] **Deliverable:** Scouting system functional

**Sprint 2 Review:**
- [ ] Recruitment flow works end-to-end
- [ ] Transfer negotiation completes
- [ ] Scouting discovers players
- **Code quality:** Run linter, fix warnings

---

### Week 3: Add Critical FM26 Features
**Goal:** Implement squad management and development tracking

**Monday-Wednesday (16 hours)**
- [ ] Build Squad Formation component
- [ ] Implement position assignment UI
- [ ] Add tactical formation selector
- [ ] Wire squad selection to match lineups
- **Deliverable:** Squad management functional

**Thursday-Friday (8 hours)**
- [ ] Implement player development tracker
- [ ] Add growth projection UI
- [ ] Display potential tracking
- [ ] **Deliverable:** Player dev system visible

**Parallel (6 hours)**
- [ ] Create financial dashboard
- [ ] Show budget allocation
- [ ] Add salary cap warnings
- **Deliverable:** Basic financial UI complete

**Sprint 3 Review:**
- [ ] Squad formation works, affects match lineups
- [ ] Player development shows growth trajectory
- [ ] Financial data displays accurately

---

### Week 4: Optimize & Polish
**Goal:** Performance improvements and UX polish

**Monday-Tuesday (8 hours)**
- [ ] Code-split large components (App.jsx, Dashboard.jsx)
- [ ] Add lazy loading for modals
- [ ] Optimize database queries
- **Deliverable:** App loads faster, no lag on interactions

**Wednesday-Thursday (8 hours)**
- [ ] Add loading states to all async operations
- [ ] Implement toast notification system
- [ ] Add proper error handling/messages
- **Deliverable:** Better UX feedback

**Friday (4 hours)**
- [ ] Mobile responsiveness audit
- [ ] Fix viewport issues
- [ ] Test on 3 screen sizes
- **Deliverable:** Mobile-friendly UI

**Sprint 4 Review:**
- [ ] Performance metrics improved 30%+
- [ ] All modals load instantly
- [ ] Mobile experience smooth

---

## Critical Success Metrics

### By End of Week 1
- ✅ All roster players have clubRole (0% showing "non défini")
- ✅ Match results display correctly (last 5 matches shown in Dashboard)
- ✅ Contract signing works (test signing 3 players)
- ✅ No console errors in browser

### By End of Week 2
- ✅ Recruitment complete (test pitching 2 players)
- ✅ Transfer flow works (test 1 full transfer)
- ✅ Scouting discovers players (test finding 5 new players)
- ✅ News feed shows game events
- ✅ Database saves all changes

### By End of Week 3
- ✅ Squad formation UI functional (select 11 players for match)
- ✅ Player development visible (shows 3+ seasons projection)
- ✅ Financial data accurate (matches game balance)
- ✅ All primary features clickable from main menu

### By End of Week 4
- ✅ App performance: Page load <2s, interactions <100ms
- ✅ Mobile: Responsive on 375px, 768px, 1280px widths
- ✅ Errors: <5 console errors during gameplay
- ✅ UX: All modals complete without confusion

---

## Known Issues to Fix Immediately

### Critical (Game Breaking)
1. **clubRole showing "non défini"** → FIXED, needs testing
   - Fix: Test in PlayerDetailModal, check localDatabase migration
   - Files: localDatabase.js, App.jsx, PlayerDetailModal.jsx
   
2. **Match results not persisting** → INVESTIGATE
   - Check: matchSystem.js, gameLogic.js, Dashboard.jsx
   - Test: Sign player → play match → check Dashboard
   
3. **Contract negotiation incomplete** → INVESTIGATE
   - Check: advancedContractSystem.js flow
   - Test: Create offer → see negotiation → complete

4. **Dashboard shows stale data** → INVESTIGATE
   - Check: React state vs IndexedDB sync
   - Test: Sign player → check roster updates

### High Priority (Feature Incomplete)
5. **Scouting is stub** → IMPLEMENT
   - Build: Scout hiring, player discovery, reports
   
6. **News feed empty** → IMPLEMENT
   - Wire: Events → news generation → feed display
   
7. **Recruitment UI unclear** → COMPLETE
   - Build: Show 4 pitch types, wire selection
   
8. **Transfer market too basic** → EXPAND
   - Add: Fee calculations, supply/demand, market value

### Medium Priority (Polish)
9. **No loading states** → ADD
   - Implement: Spinners, disabled buttons during requests
   
10. **Mobile responsiveness unclear** → TEST
    - Test: All components on mobile viewport
    
11. **Error messages missing** → ADD
    - Implement: Toast notifications for errors
    
12. **No accessibility** → ADD
    - Implement: ARIA labels, semantic HTML

---

## Implementation Checklist: Week 1

### Fix clubRole (2 days)
- [ ] Read localDatabase.js assignIntelligentClubRole() function
- [ ] Verify logic is correct (percentile calculation)
- [ ] Check migration function ensurePlayersHaveClubRole runs on startup
- [ ] Test: Open App → wait 5s → check any player → verify clubRole populated
- [ ] Test: Multiple browsers, fresh IndexedDB
- [ ] Document: How clubRole assignment works

### Fix Match Results (2 days)
- [ ] Read matchSystem.js, find result generation
- [ ] Check how results are stored (gameLogic.js?)
- [ ] Verify stats update player.attributes
- [ ] Test: Sign player → play week → match results show → Dashboard updates
- [ ] Check: Player rating changes after match
- [ ] Document: Match flow from generation to result

### Fix Contract Flow (1 day)
- [ ] Read advancedContractSystem.js contracts structure
- [ ] Check NegotiationModals.jsx flow
- [ ] Test: Create offer → show negotiation → accept → save
- [ ] Verify: Contract saved to player object
- [ ] Document: Contract creation to signature flow

### Dashboard Real-Time (1 day)
- [ ] Check: What data Dashboard needs (roster, matches, contracts)
- [ ] Verify: Data refreshes after operations
- [ ] Test: Make change → see Dashboard update
- [ ] Fix: Any stale data issues
- [ ] Document: Dashboard data sources and refresh logic

---

## Resource Files

### System Dependencies Map
```
App.jsx
├── squadDatabase.js (player generation)
├── localDatabase.js (persistence)
├── matchSystem.js (match scheduling)
├── messageSystem.js (events)
└── All 40 systems

PlayerDetailModal.jsx
├── attributesSystem.js (17 stats)
├── relationshipSystem.js (trust/moral)
├── advancedContractSystem.js (contracts)
└── gameLogic.js (actions)

Dashboard.jsx
├── matchSystem.js (upcoming)
├── seasonSystem.js (current week)
├── agencyReputationSystem.js (reputation)
└── economy.js (finances)
```

### Testing Commands
```bash
# Open browser DevTools
# In Console:
JSON.stringify(window.gameState, null, 2)  # Check game state

# Check IndexedDB
# Open DevTools → Application → IndexedDB → agent_foot_local_db

# Check localStorage
localStorage.getItem('agentfoot_saves')
```

### Git Workflow
```bash
git branch feature/fix-clubrole
# Make changes
git commit -m "Fix: clubRole assignment for all players"
git push origin feature/fix-clubrole
# Create PR, test, merge
```

---

## Questions for Clarification

Before starting development, confirm:

1. **Target Platform:** Mobile-first (375px)? Desktop? Both?
2. **Browser Support:** Modern only? IE11? What versions?
3. **Performance Targets:** Page load time? Max component size?
4. **Data Retention:** How many seasons to save? Rotation policy?
5. **Difficulty Settings:** Keep Easy/Normal/Hardcore? Customize?
6. **Updates Strategy:** Auto-update game state weekly? On launch only?
7. **Multiplayer:** Single player only? Friend leaderboards?
8. **Monetization:** Free? Ads? In-app purchases? Season pass?
9. **Platform:** Web only? App store? Both?
10. **Offline:** Must work offline? Or always online?

---

**Last Updated:** April 21, 2026  
**Next Review:** After Week 1 Sprint Completion  
**Status:** 🟡 In Planning Phase
