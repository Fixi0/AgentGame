# Scouting Visibility System
## "Hidden Potential" Mechanic - Discover Players Over Time

**Concept:** Unlike FM where you see ALL players' full stats, in Agent Game you discover players progressively. There's risk and reward.

---

## How It Works

### 1. **VISIBILITY LEVELS** (5 stages)

```
UNKNOWN (0)    → Joueur invisible, vous ne savez rien
   ↓
RUMOR (1)      → Juste un nom, "j'ai entendu parler de..."
   ↓
SCOUTED (2)    → Age, poste, club - infos basiques
   ↓
ANALYZED (3)   → Stats visibles MAIS avec marge d'erreur (±4)
   ↓
EVALUATED (4)  → Stats complètes, POTENTIEL CACHÉ ⚠️
   ↓
SIGNED (5)     → POTENTIEL RÉEL DÉCOUVERT après signature
```

### 2. **What You SEE at Each Level**

#### RUMOR Level
```
Nom: "Gabriel Fixio"
Club: PSG
Position: ATT
Âge: ??? (caché)
Stats: ??? (tout caché)
```

#### SCOUTED Level
```
Nom: Gabriel Fixio
Club: PSG
Position: ATT
Âge: 21
Rating: ??? (pas visible)
Stats: ??? (pas visible)
```

#### ANALYZED Level
```
Nom: Gabriel Fixio
Club: PSG
Position: ATT
Âge: 21
Rating: 67 ± 4 (peut être 63-71)
Form: 52 ± 8 (estimé)
Attributes: **FLOUS** (±3 d'incertitude)
```

#### EVALUATED Level
```
Nom: Gabriel Fixio
Club: PSG
Position: ATT
Âge: 21
Rating: 67 (exact)
Form: 52 (exact)
Attributes: TOUS VISIBLES (exact)
Potentiel: ??? ⚠️ CACHÉ (gros risque)
```

#### SIGNED Level
```
Nom: Gabriel Fixio
Club: MON AGENCE
Position: ATT
Âge: 21
Rating: 67
Attributes: TOUS VISIBLES
Potentiel: 84 ✨ DÉCOUVERT!
Surprise: +17 (meilleur que sa note actuelle!)
```

---

## How Visibility INCREASES

### Automatic (Free)
- **Reputation:** 
  - 200+ rep = Players in Tier 1 clubs visible at SCOUTED level
  - 400+ rep = ANALYZED level for known players
  - 700+ rep = EVALUATED level

- **Club Relations:**
  - Good relations with club = better visibility of their players

- **Player Notoriety:**
  - Rating 85+ = SCOUTED level automatically
  - Rating 80+ = visible at RUMOR level

### Scouts (Cost Money)
```
1 Scout    → RUMOR → SCOUTED for all free agents
2 Scouts   → + ANALYZED for promising players  
3 Scouts   → + EVALUATED for targets
```

### Manual Scouting (Pay to Improve)
```
Scout "Gabriel Fixio" specifically:
- RUMOR → SCOUTED:  3,000€
- SCOUTED → ANALYZED: 8,000€
- ANALYZED → EVALUATED: 15,000€

Total = 26,000€ to know everything except potentiel
```

---

## The BIG RISK: Potentiel Caché

Even at EVALUATED level, you DON'T see potentiel.

### Example Scenarios

**Scenario 1: Diamond in Rough**
```
Sign Gabriel Fixio (Rating: 67, Evaluated)
Pay: 45,000€ contract

AFTER SIGNING → Potential REVEALED: 84 ✨
You got: Young prospect with 17-point ceiling
Value: EXCELLENT - can develop to elite
ROI: ++
```

**Scenario 2: Peaked Player**
```
Sign "Experienced DF" (Rating: 76, Evaluated)
Pay: 120,000€ contract

AFTER SIGNING → Potential REVEALED: 76
You got: Player with NO room to grow
Value: POOR - what you see is what you get
ROI: --
```

**Scenario 3: Injury Risk**
```
Sign "Rising Star" (Rating: 79, Evaluated)
Pay: 150,000€ contract

AFTER SIGNING → Potential REVEALED: 88
BUT THEN: Gets injured 2 weeks later
Value: CATASTROPHIC - damaged asset
ROI: ---
```

---

## Market Mechanics

### Limited Player Pool
You only see players based on YOUR visibility:

```
Your Current Visibility:
- Reputation: 150 (low)
- Scouts: 0
- Club Relations: Average

VISIBLE PLAYERS:
- Tier 1 club stars (85+ rating) = RUMOR
- Recent free agents = SCOUTED
- Total: ~30 players instead of 500

TO SEE MORE:
- Hire scouts (+cost, +scouts available)
- Improve reputation (longer term)
- Improve club relations (negotiate)
```

### Visibility Decay
If you have a scout on a player but don't update for 8 weeks:
```
Week 1: EVALUATED (fresh info)
Week 8: ANALYZED (info getting old)
Week 16: SCOUTED (outdated)
```

Re-scout to refresh information.

---

## Player Revealed Potential

When signed, potential revealed = mix of:
- Current attributes average
- Age factor (young = can grow, old = limited)
- Random "surprise factor" (hidden ceiling)

### Example Calculations

**Young Prospect (19 yo, Rating 65)**
```
Base potential = avg_attributes * 5 + rating * 0.3
               = 13 * 5 + 65 * 0.3
               = 65 + 19.5 = 84.5

Age bonus (19) = +rand(2,8) = +6
Final potential = 90 ✨

Surprise = +25 (exceptional discovery!)
```

**Peak Player (28 yo, Rating 78)**
```
Base potential = 78

Age penalty (28) = -rand(2,8) = -5
Final potential = 73

Surprise = -5 (declining, not improving)
```

---

## UI/UX Changes Needed

### Market Page
- ✅ Show VISIBILITY LEVEL (icon + label)
- ✅ Show known stats only (gray out unknown)
- ✅ Show COST to improve visibility (if < EVALUATED)
- ✅ Show "Marge d'erreur ±4" for ANALYZED
- ✅ Show "⚠️ Potentiel caché" for EVALUATED

### Player Card
- ✅ Show actual stats OR estimated stats (with ±)
- ✅ Show "Découvrir le potentiel" button (cost)
- ✅ AFTER signing: show actual potentiel with surprise label

### Dashboard
- ✅ Show scout status (how many scouts, next update)
- ✅ Show "Players need refreshing" alert (visibility decay)
- ✅ Show potential surprises in news feed

---

## Examples in Action

### Week 1 - New Agent
```
Market has 35 visible players (all RUMOR level)
- Can see names, clubs, positions
- Cannot see ratings or attributes
- Cost: Hire 1st scout (8,000€)
```

### Week 5 - Hire Scout
```
Scout hired! Visibility improved
- Free agents now SCOUTED (age, club visible)
- Tier 1 stars now RUMOR (at least visible)
- 45 players now visible

Research: "Who's the best young DM?"
Cost per target: 8,000€ to ANALYZED
```

### Week 10 - Scout Analysis
```
Scout report: "Gabriel Fixio - rating ~67±4, young, potential UNKNOWN"
Decision:
- Risk 45,000€ on unknown potential? 
- Or scout 3 more players at ANALYZED level first?

You choose: SIGN (risky) vs ANALYZE (cautious)
```

### Week 15 - Gabriel Signed
```
Contract signed: 3 years, 45,000€/season

SURPRISE! Potential = 84 ✨ (+17)
- Young, trainable, could reach elite level
- Excellent investment!

Weekly news: "Gabriel Fixio shows promise in training"
```

---

## Strategic Depth

### Conservative Strategy
- Hire 3+ scouts
- Scout every target to EVALUATED
- Sign only "sure bets"
- Lower ROI but less risk

### Aggressive Strategy  
- Few scouts
- Sign prospects early at SCOUTED level
- Hope for hidden gems
- Higher ROI but more risk

### Balanced Strategy
- 2 scouts
- ANALYZE key targets
- Sign mix of evaluated + analyzed
- Moderate risk/reward

---

## Stat Distribution Notes

- **Visibility decay:** 10% per week (stay current!)
- **Scout cost per level:** 3k → 8k → 15k (diminishing)
- **Potential surprise range:** -8 to +18 points
- **Age multiplier:** Young get +2 to +8, Old get -8 to -2
- **Information decay:** EVALUATED → ANALYZED in 8 weeks

---

## Next Steps

1. ✅ Create scoutingVisibilitySystem.js (DONE)
2. ⏳ Wire into Market.jsx
3. ⏳ Update PlayerCard to show BLURRY/FULL stats
4. ⏳ Add "Scout Player" button with cost
5. ⏳ Track visibility per player
6. ⏳ Reveal potential on signature
7. ⏳ Add scout hiring to staff system
8. ⏳ Add "Refresh Scout Info" action

---

**Impact:** Changes game from "Pick best stats" to "Make calculated risks"  
**Depth:** Strategic scouting becomes major mechanic  
**Realism:** Matches agent game - you don't know everything upfront  
**Fun:** Discovery moments when potentiel revealed!
