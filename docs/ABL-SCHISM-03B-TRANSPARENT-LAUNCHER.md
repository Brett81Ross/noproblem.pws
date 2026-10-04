# ABL-SCHISM-03B — Transparent launcher icon

Status: DEVELOPMENT CANDIDATE
Owner direction: APPROVED
Production deployment: NOT AUTHORIZED

## Visual target

The SchismMatrix launcher mark should visually behave like the owner's Neon reference: the split-S mark appears to float over the device wallpaper with no intentionally drawn square, circle, plate, tile, or opaque background around the symbol.

## Implementation

The web-app manifest now points its install icon at the deterministic SchismMatrix SVG master with `purpose: any`.

The SVG contains symbol geometry only and does not draw a background rectangle. This preserves transparency around and through the mark wherever the launcher honors the supplied transparent icon.

## Android caveat

Launcher rendering remains platform/launcher controlled. Android launchers can mask, normalize, scale, or otherwise present installed web-app icons. Therefore the target is **transparent source artwork**, not a guarantee that every launcher will reproduce Neon's exact presentation.

No `maskable` purpose is declared in this candidate because a maskable icon is specifically intended to fill a launcher-defined safe shape and conflicts with the owner's no-visible-tile target.

## Validation gate

Before production:
- install the development candidate on the target Galaxy Z Fold;
- inspect the unfolded launcher;
- inspect the cover-screen launcher;
- confirm no authored background plate is visible;
- confirm the S remains large and legible;
- confirm install name reads SchismMatrix;
- confirm existing app startup still works;
- if Samsung/One UI imposes unwanted treatment, adjust the install packaging rather than baking a fake background into the logo.

No production deployment is authorized by this document.
