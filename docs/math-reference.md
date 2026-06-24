# Math Reference

## Longitudinal Chromatic Aberration
- Red (700nm) focused behind retina → appears to advance.
- Blue (400nm) focused in front of retina → appears to recede.
- Brain interprets focal mismatch as depth.

## Pupil Decentration
Effect stronger when pupil is off-center from optical axis — true for most people.

## Polarity Inversion
White background can invert the effect (blue advances, red recedes) due to different adaptation.

## Max Saturation Requirement
Pure `#FF0000` and `#0000FF` only. Orange/cyan are too weak. Enforce:
```
maxC = max(r, max(g, b))
if maxC > 0: rgb /= maxC
```
