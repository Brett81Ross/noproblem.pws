# ABL-SCHISM-03A — Concept 01 approved direction

Status: OWNER-APPROVED VISUAL DIRECTION
Official production asset: NOT YET
Production integration: NO
Deployment authorization: NO

## Owner decision

Brett approved Concept 01 as the visual direction after reviewing the refined identity board.

This approval locks the **direction**, not generated raster artwork or generated typography as production source assets.

## Locked direction

- Brand: **SchismMatrix™**
- Descriptor: **Property Intelligence**
- Core mark: geometric split **S**
- Defining device: a controlled central discontinuity dividing one coherent form into two readable planes
- Primary visual character: precise, technical, high-contrast, dark property-intelligence software
- Marketing treatment may use cyan + cool metallic/silver dimensional rendering
- Product/UI treatment must have a clean flat form
- Monochrome form must remain recognizable
- Mark must remain legible at app-icon and small-icon sizes

## Meaning

The split directly expresses *schism* without literal broken-house imagery. The opposed planes can suggest evidence and interpretation, predicted and actual, or observation and decision without permanently assigning one semantic pair.

The symbol remains independent of pressure-washing imagery so SchismMatrix can operate as a standalone property-intelligence product.

## Production asset requirements

The concept board is the visual reference, not the source-of-truth asset. Production implementation requires deterministic assets that:

1. preserve the approved split-S silhouette;
2. remain readable at 32–48 px;
3. work without gradients, glow, chrome, or 3D rendering;
4. include dark, light, and monochrome variants;
5. include symbol-only and horizontal/stacked lockups;
6. use deterministic typography rather than generated lettering;
7. define clear space and minimum size;
8. remain usable on narrow mobile and Fold layouts;
9. undergo reasonable visual-similarity review before final adoption.

## Asset hierarchy

**Master identity:** flat deterministic mark and wordmark.

**Product/UI:** flat mark, restrained cyan accent, high-contrast wordmark.

**Marketing/presentation:** dimensional metallic/cyan treatment may be derived from the master identity.

The dimensional treatment never replaces the flat master.

## Compatibility guardrail

Visual rebranding must not rename or break compatibility identifiers during this ABL. Existing API paths, `matrix-*` modules, environment variables, package identifiers, and legacy browser-storage keys remain unchanged until separately migrated and tested.

## Deployment guardrail

Owner approval of the visual direction is **not** authorization to merge or deploy. Production remains untouched until an implementation candidate is built, reviewed, and explicitly authorized.

## Next gate

Create deterministic development assets and integrate them only on the SchismMatrix development branch. Validate small-size, dark/light, monochrome, mobile/Fold presentation, and preservation of application behavior before requesting deployment approval.
