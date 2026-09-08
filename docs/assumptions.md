# Simulation assumptions

Every parameter used to generate simulated bettors, with its justification and source.
This document is the project's credibility. A parameter without a stated basis is a
liability in an interview — write the justification when you set the value, not later.

## Status: not yet started (Week 1 deliverable)

## Template for each parameter
```
### <parameter name>
- **Value / distribution:**
- **Basis:** (public source, measured from the real data, or reasoned estimate)
- **Sensitivity:** does the conclusion change if this is wrong by 2x?
```

## Hard constraint carried from SCOPE.md 3b
Simulated bettors derive edge estimates from information available **at market open only**.
They are never shown closing prices. Violating this makes the closing-line-movement
validation circular and worthless.
