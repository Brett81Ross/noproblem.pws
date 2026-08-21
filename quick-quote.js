(function () {
  'use strict';

  var MAX_PHOTOS = 24;
  var photoTags = {};
  var skippedViews = {};
  var measurements = {};
  var activeGuide = 'property_overview';
  var pendingSavedGuide = null;

  var STANDARD_GUIDES = [
    'property_overview',
    'house_wash',
    'driveway_cleaning',
    'sidewalk_cleaning',
    'patio_cleaning',
    'deck_cleaning',
    'fence_cleaning',
    'retaining_wall',
    'dumpster_pad',
    'oil_treatment',
    'roof_soft_wash'
  ];

  var SPECIALTY_GUIDES = [
    'memorial_cleaning',
    'vehicle_wash',
    'aircraft_exterior_wash',
    'custom_area'
  ];

  var GUIDES = {
    property_overview: {
      title: 'Property overview',
      category: 'Fast quote foundation',
      copy: 'Capture the job setup once. Skip anything that does not apply.',
      prompts: [
        ['Street / approach', 'Show the property, parking, and equipment approach.'],
        ['Water and access', 'Show the water source, gates, and equipment path.'],
        ['Plants and electrical', 'Show landscaping, outlets, fixtures, and sensitive areas.'],
        ['Obstacles', 'Show vehicles, furniture, pets, drainage, or restricted access.']
      ],
      fields: []
    },
    house_wash: {
      title: 'House wash',
      category: 'Property cleaning',
      copy: 'Four elevations give the Matrix a complete exterior instead of one front view.',
      prompts: [
        ['Front exterior', 'Capture the full front wall from corner to corner.'],
        ['Rear exterior', 'Capture the full rear wall and attached features.'],
        ['Left side', 'Capture the complete left elevation.'],
        ['Right side', 'Capture the complete right elevation.'],
        ['Problem detail', 'Add a close-up of growth, oxidation, stains, or damage.']
      ],
      fields: [['approxSquareFeet', 'Approx. exterior sq. ft.', 'number', 'Optional'], ['surfaceMaterial', 'Exterior material', 'text', 'Brick, vinyl, stucco...']]
    },
    driveway_cleaning: {
      title: 'Driveway',
      category: 'Property cleaning',
      copy: 'Capture the entire slab plus the details that change time and chemical use.',
      prompts: [
        ['Street approach', 'Show the full driveway from the street.'],
        ['Reverse angle', 'Show the full driveway looking back toward the street.'],
        ['Surface condition', 'Show representative staining, growth, or tire marks.'],
        ['Edges and drainage', 'Show borders, slopes, drains, and connected walkways.']
      ],
      fields: [['lengthFeet', 'Approx. length (ft)', 'number', 'Optional'], ['widthFeet', 'Approx. width (ft)', 'number', 'Optional']]
    },
    sidewalk_cleaning: {
      title: 'Sidewalk / walkways',
      category: 'Property cleaning',
      copy: 'Follow the full route so hidden sections are not missed.',
      prompts: [
        ['Starting point', 'Show where the walkway begins.'],
        ['Middle section', 'Show the main run, width, and surface condition.'],
        ['Ending point', 'Show where the walkway ends or connects.'],
        ['Problem detail', 'Show stains, joints, steps, edges, or drainage.']
      ],
      fields: [['lengthFeet', 'Approx. total length (ft)', 'number', 'Optional'], ['widthFeet', 'Approx. width (ft)', 'number', 'Optional']]
    },
    patio_cleaning: {
      title: 'Patio / pool deck',
      category: 'Property cleaning',
      copy: 'Show the whole entertaining area and anything that must be moved or protected.',
      prompts: [
        ['Full area', 'Capture the entire patio or pool deck.'],
        ['Opposite angle', 'Capture the area from the far side.'],
        ['Surface detail', 'Show material, joints, stains, and organic growth.'],
        ['Access and obstacles', 'Show gates, furniture, pool edges, drains, and plants.']
      ],
      fields: [['lengthFeet', 'Approx. length (ft)', 'number', 'Optional'], ['widthFeet', 'Approx. width (ft)', 'number', 'Optional']]
    },
    deck_cleaning: {
      title: 'Deck',
      category: 'Property cleaning',
      copy: 'Use multiple angles so the Matrix can estimate the full deck area, rails, and steps.',
      prompts: [
        ['Full deck area', 'Show the complete deck and attached features.'],
        ['Opposite angle', 'Capture the same area from the other end.'],
        ['Rails and steps', 'Show railings, stairs, posts, and tight access.'],
        ['Material and condition', 'Add a close-up of wood, composite, stain, or growth.']
      ],
      fields: [['lengthFeet', 'Approx. length (ft)', 'number', 'Optional'], ['widthFeet', 'Approx. width (ft)', 'number', 'Optional'], ['material', 'Material', 'text', 'Wood, composite...']]
    },
    fence_cleaning: {
      title: 'Fencing',
      category: 'Property cleaning',
      copy: 'Follow the full fence line so every section, side, gate, and access issue is included.',
      prompts: [
        ['Full fence run', 'Show the complete run from one end.'],
        ['Opposite-end angle', 'Capture the complete run from the other end.'],
        ['Front surface', 'Show the primary face and representative condition.'],
        ['Back surface', 'Show the reverse side when it is part of the scope and accessible.'],
        ['Gates and posts', 'Show gates, posts, corners, height changes, and tight access.'],
        ['Material detail', 'Close up wood, vinyl, metal, stain, growth, or damage.']
      ],
      fields: [['linearFeet', 'Approx. total length (ft)', 'number', 'Required for best quote'], ['heightFeet', 'Approx. height (ft)', 'number', 'Optional'], ['material', 'Material', 'text', 'Wood, vinyl, metal...'], ['sides', 'Sides to clean', 'text', 'Front, back, or both']]
    },
    retaining_wall: {
      title: 'Retaining wall',
      category: 'Property cleaning',
      copy: 'Capture the complete span, height, material, and nearby drainage.',
      prompts: [
        ['Full wall', 'Show the complete retaining wall.'],
        ['Left end', 'Show the left end, access, and surrounding grade.'],
        ['Right end', 'Show the right end, access, and surrounding grade.'],
        ['Surface detail', 'Show blocks, joints, staining, growth, or damage.']
      ],
      fields: [['lengthFeet', 'Approx. length (ft)', 'number', 'Optional'], ['heightFeet', 'Approx. average height (ft)', 'number', 'Optional']]
    },
    dumpster_pad: {
      title: 'Bins / dumpster pad',
      category: 'Commercial cleaning',
      copy: 'Show the entire waste area, buildup, drainage, and equipment access.',
      prompts: [
        ['Full pad', 'Capture the complete pad and surrounding concrete.'],
        ['Containers', 'Show bins, dumpsters, walls, and enclosures.'],
        ['Grease and buildup', 'Show the heaviest contamination close-up.'],
        ['Drainage and access', 'Show drains, slopes, gates, and service access.']
      ],
      fields: [['containerCount', 'Bin / dumpster count', 'number', 'Optional'], ['padSize', 'Approx. pad size', 'text', 'Example: 20 x 30 ft']]
    },
    oil_treatment: {
      title: 'Oil / stain treatment',
      category: 'Specialty treatment',
      copy: 'A wide view and close details help separate spot treatment from full-surface work.',
      prompts: [
        ['Wide area', 'Show where the stain sits within the full surface.'],
        ['Close-up', 'Show color, texture, spread, and severity.'],
        ['Second angle', 'Show runoff direction, nearby materials, and drainage.']
      ],
      fields: [['stainType', 'Known stain type', 'text', 'Oil, rust, oxidation...'], ['affectedArea', 'Approx. affected area', 'text', 'Optional']]
    },
    roof_soft_wash: {
      title: 'Roof soft wash',
      category: 'Multiple-level cleaning',
      copy: 'Use ground-level roofline views. Do not climb or enter an unsafe area for a quote.',
      prompts: [
        ['Front roofline', 'Show the front pitch, gutters, peaks, and staining.'],
        ['Rear roofline', 'Show the rear pitch, valleys, and staining.'],
        ['Side roofline', 'Show roof height, material, and access from the side.'],
        ['Problem detail', 'Zoom from a safe position on heavy growth or difficult sections.']
      ],
      fields: [['roofMaterial', 'Roof material', 'text', 'Shingle, metal, tile...'], ['approxRoofSize', 'Approx. roof size', 'text', 'Optional']]
    },
    memorial_cleaning: {
      title: 'Tombstones / memorials',
      category: 'Memorial cleaning',
      copy: 'Document the material and every surface. Fragile stone requires an on-site test and cemetery approval.',
      prompts: [
        ['Front face', 'Show the full front, lettering, and base.'],
        ['Back face', 'Show the complete rear surface.'],
        ['Left and right sides', 'Show edges, joints, cracks, and nearby markers.'],
        ['Base and ground', 'Show the base, soil, drainage, and surrounding plants.'],
        ['Material detail', 'Close up the stone texture, growth, stains, and fragile areas.']
      ],
      fields: [['markerCount', 'Marker / monument count', 'number', 'Required for best quote'], ['material', 'Stone material', 'text', 'Granite, marble, limestone, unknown'], ['cemeteryApproval', 'Cemetery approval', 'text', 'Approved, pending, unknown']]
    },
    vehicle_wash: {
      title: 'Vehicles / fleets',
      category: 'Specialty / commercial',
      copy: 'Capture representative vehicle types and the wash location instead of photographing every identical unit.',
      prompts: [
        ['Front and driver side', 'Show vehicle size, type, and visible buildup.'],
        ['Rear and passenger side', 'Show the remaining exterior surfaces.'],
        ['Roof / upper surfaces', 'Show safe visible upper areas or tall fleet bodies.'],
        ['Wheels and problem areas', 'Show wheels, underbody edges, bugs, grease, or heavy soil.'],
        ['Fleet lineup', 'Show quantity and the mix of vehicle sizes.'],
        ['Wash area', 'Show water, drainage, access, and surrounding property.']
      ],
      fields: [['vehicleCount', 'Vehicle count', 'number', 'Required for best quote'], ['vehicleTypes', 'Vehicle types', 'text', 'Cars, pickups, vans, box trucks...']]
    },
    aircraft_exterior_wash: {
      title: 'Aircraft exterior',
      category: 'Specialty / commercial',
      copy: 'Exterior estimate only. Final scope requires operator authorization, airport compliance, and on-site verification.',
      warning: 'Do not photograph restricted information. Engines, interiors, maintenance, deicing systems, sensors, and openings remain outside this quote.',
      prompts: [
        ['Full aircraft profile', 'Show aircraft class, overall size, and access.'],
        ['Opposite profile', 'Show the other side and remaining fuselage.'],
        ['Wings and tail', 'Show wings, tail surfaces, height, and reach requirements.'],
        ['Landing gear and lower surfaces', 'Show visible buildup and access without entering restricted areas.'],
        ['Problem areas', 'Show bugs, exhaust residue, oil, or heavy soil from a safe position.'],
        ['Wash location', 'Show hangar or ramp access, water, drainage, and containment.']
      ],
      fields: [['aircraftCount', 'Aircraft count', 'number', 'Required for best quote'], ['aircraftType', 'Aircraft type / class', 'text', 'Single-engine, turboprop, business jet...'], ['facilityApproval', 'Operator / facility approval', 'text', 'Approved, pending, unknown']]
    },
    custom_area: {
      title: 'Custom cleaning area',
      category: 'Custom scope',
      copy: 'Name the area, show the complete scope, then add as many useful details as needed.',
      prompts: [
        ['Full area', 'Show the complete custom cleaning area.'],
        ['Opposite angle', 'Show the same area from the other side.'],
        ['Surface detail', 'Show material, buildup, stains, or damage.'],
        ['Access and hazards', 'Show equipment access and anything that must be protected.']
      ],
      fields: [['areaName', 'Area name', 'text', 'Required'], ['dimensions', 'Approx. dimensions / quantity', 'text', 'Optional']]
    }
  };

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function installStyles() {
    if (document.getElementById('npQuickQuoteStyles')) return;
    var style = document.createElement('style');
    style.id = 'npQuickQuoteStyles';
    style.textContent = [
      '#evidenceCard .photo-actions{display:none!important}',
      '#evidenceGrid{display:none!important}',
      'body.np-photo-review-open #evidenceGrid{display:grid!important}',
      '.np-photo-planner{margin:14px 0 12px;padding:14px;border:1px solid rgba(105,231,244,.2);border-radius:16px;background:linear-gradient(145deg,rgba(5,24,34,.9),rgba(13,12,29,.9))}',
      '.np-plan-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:12px}',
      '.np-plan-head h3{margin:0;color:#f5fbff;font-size:17px}.np-plan-head p{margin:5px 0 0;color:#86a4b1;font-size:11px;line-height:1.45}',
      '.np-plan-count{flex:none;padding:7px 10px;border:1px solid rgba(171,255,79,.28);border-radius:999px;color:#caff8b;background:rgba(171,255,79,.08);font-size:10px;font-weight:900;text-transform:uppercase}',
      '.np-plan-list{display:grid;gap:8px}.np-plan-service{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid rgba(155,124,255,.2);border-radius:12px;background:rgba(2,12,20,.72)}',
      '.np-plan-service strong{display:block;color:#dff8ff;font-size:12px}.np-plan-service span{display:block;margin-top:3px;color:#7898a5;font-size:10px}',
      '.np-plan-button,.np-review-button,.np-capture-button,.np-skip-button{min-height:38px;border:1px solid rgba(100,226,240,.3);border-radius:10px;color:#bff8ff;background:rgba(4,20,29,.84);font-size:10px;font-weight:900;letter-spacing:.03em;cursor:pointer}',
      '.np-plan-button{padding:8px 11px}.np-review-button{width:100%;margin-top:10px;padding:9px 12px;color:#ffe4a8;border-color:rgba(255,200,87,.3)}',
      '.np-specialty-group{grid-column:1/-1;border:1px solid rgba(255,200,87,.22);border-radius:13px;background:rgba(255,200,87,.045)}.np-specialty-group summary{padding:13px;color:#ffe1a0;font-size:11px;font-weight:900;letter-spacing:.04em;cursor:pointer;list-style:none}.np-specialty-group summary::-webkit-details-marker{display:none}.np-specialty-group summary:after{float:right;content:"＋"}.np-specialty-group[open] summary:after{content:"−"}.np-specialty-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 10px 10px}.np-specialty-grid .service-chip{min-height:54px}',
      '.np-capture-screen[hidden]{display:none!important}.np-capture-screen{position:fixed;z-index:10000;inset:0;overflow:auto;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:radial-gradient(circle at 20% 0,rgba(0,211,230,.2),transparent 28rem),linear-gradient(145deg,#02070b,#071925 55%,#0d0a1c)}',
      '.np-capture-shell{width:min(100%,820px);margin:0 auto}.np-capture-top{position:sticky;z-index:2;top:0;display:flex;gap:12px;align-items:center;padding:8px 0 14px;background:linear-gradient(#030b11 70%,transparent)}',
      '.np-back-button{min-width:72px;min-height:42px;border:1px solid rgba(111,231,244,.3);border-radius:12px;color:#c9f8ff;background:#06141d;font-weight:900;cursor:pointer}',
      '.np-capture-title{flex:1}.np-capture-title small{display:block;color:#ffc857;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.np-capture-title h2{margin:4px 0 0;color:#f7fbff;font-size:22px}',
      '.np-capture-copy{margin:0 0 12px;color:#92acb7;font-size:13px;line-height:1.5}.np-capture-warning{margin:0 0 12px;padding:11px;border:1px solid rgba(255,170,88,.3);border-radius:11px;color:#ffd9a1;background:rgba(255,142,76,.09);font-size:11px;line-height:1.45}',
      '.np-guide-switch{display:grid;gap:8px;margin:0 0 14px;padding:11px;border:1px solid rgba(255,200,87,.27);border-radius:12px;background:linear-gradient(135deg,rgba(255,200,87,.09),rgba(155,124,255,.08))}.np-guide-switch>span{color:#ffe2a2;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.np-guide-switch select{width:100%;min-height:48px;box-sizing:border-box;border:1px solid rgba(112,229,241,.32);border-radius:10px;padding:9px 38px 9px 12px;color:#effcff;background:#04141e;font-size:16px;font-weight:800}.np-guide-switch option,.np-guide-switch optgroup{color:#effcff;background:#04141e}.np-guide-levels{display:grid;grid-template-columns:1fr 1fr;gap:7px}.np-guide-levels button{min-height:42px;border:1px solid rgba(112,229,241,.25);border-radius:9px;color:#9ab6c1;background:#061722;font-size:11px;font-weight:900}.np-guide-levels button[aria-pressed="true"]{color:#071019;border-color:transparent;background:linear-gradient(135deg,#9cf8ff,#66dfe9 65%,#ad94ff)}',
      '.np-measurements{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px}.np-measure-field{display:grid;gap:5px;color:#acc6cf;font-size:10px;font-weight:800}.np-measure-field input{width:100%;min-height:44px;box-sizing:border-box;border:1px solid rgba(108,222,235,.2);border-radius:10px;padding:10px;color:#f4fbff;background:#031018;font-size:16px}',
      '.np-prompt-list{display:grid;gap:9px}.np-prompt{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid rgba(155,124,255,.22);border-radius:14px;background:linear-gradient(135deg,rgba(11,35,44,.9),rgba(13,13,31,.9))}',
      '.np-prompt.is-captured{border-color:rgba(171,255,79,.4)}.np-prompt.is-skipped{opacity:.62}.np-prompt strong{display:block;color:#e9fbff;font-size:13px}.np-prompt p{margin:4px 0 0;color:#84a2ad;font-size:10px;line-height:1.4}.np-prompt-status{margin-top:5px!important;color:#baff77!important;font-weight:900!important}',
      '.np-prompt-actions{display:grid;gap:6px}.np-capture-button{padding:7px 10px;color:#051017;background:linear-gradient(135deg,#91f6ff,#59dae8)}.np-skip-button{padding:6px 9px}',
      '.np-capture-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.np-capture-footer button{min-height:48px;border:1px solid rgba(112,229,241,.28);border-radius:12px;color:#dffbff;background:#061722;font-weight:900;cursor:pointer}.np-capture-footer .np-done{grid-column:1/-1;color:#071019;background:linear-gradient(135deg,#9cf8ff,#66dfe9 55%,#ad94ff)}',
      '.np-slot-tag{position:absolute;z-index:4;right:8px;bottom:8px;max-width:75%;padding:4px 7px;border-radius:999px;color:#061018;background:#8ff4ff;font-size:8px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'body.np-capture-open{overflow:hidden}',
      '@media(max-width:520px){.np-specialty-grid,.np-measurements{grid-template-columns:1fr}.np-prompt{grid-template-columns:1fr}.np-prompt-actions{grid-template-columns:1fr 1fr}.np-capture-title h2{font-size:19px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function createInterface() {
    var grid = document.getElementById('evidenceGrid');
    if (!grid || document.getElementById('npPhotoPlanner')) return;

    var planner = document.createElement('div');
    planner.id = 'npPhotoPlanner';
    planner.className = 'np-photo-planner';
    grid.parentNode.insertBefore(planner, grid);

    var screen = document.createElement('section');
    screen.id = 'npCaptureScreen';
    screen.className = 'np-capture-screen';
    screen.hidden = true;
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Guided photo capture');
    screen.innerHTML = '<div class="np-capture-shell"><div class="np-capture-top"><button class="np-back-button" type="button" data-np-close>← Back</button><div class="np-capture-title"><small id="npGuideCategory"></small><h2 id="npGuideTitle"></h2></div></div><p class="np-capture-copy" id="npGuideCopy"></p><div class="np-guide-switch"><span>All quote areas</span><select id="npGuideSwitch" aria-label="Switch quote area"></select><div class="np-guide-levels" role="group" aria-label="Building height"><button type="button" data-np-level="one">One story</button><button type="button" data-np-level="multiple">Multiple levels</button></div></div><div id="npGuideWarning"></div><div class="np-measurements" id="npGuideFields"></div><div class="np-prompt-list" id="npPromptList"></div><div class="np-capture-footer"><button type="button" data-np-saved>↥ Add saved photos</button><button type="button" data-np-extra>◎ Add extra photo</button><button class="np-done" type="button" data-np-close>Done with this area</button></div></div>';
    document.body.appendChild(screen);

    planner.addEventListener('click', handlePlannerClick);
    screen.addEventListener('click', handleCaptureClick);
    screen.addEventListener('input', handleMeasurementInput);
    screen.addEventListener('change', handleGuideChange);
  }

  function createSpecialtyGroup() {
    var scopeGrid = document.getElementById('scopeGrid');
    if (!scopeGrid || document.getElementById('npSpecialtyGroup')) return;
    var buttons = ['memorial_cleaning', 'vehicle_wash', 'aircraft_exterior_wash', 'custom_area'].map(function (id) {
      return scopeGrid.querySelector('[data-service="' + id + '"]');
    }).filter(Boolean);
    if (!buttons.length) return;

    var details = document.createElement('details');
    details.id = 'npSpecialtyGroup';
    details.className = 'np-specialty-group';
    details.innerHTML = '<summary>Specialty / Commercial · Memorials, vehicles, aircraft</summary><div class="np-specialty-grid"></div>';
    var grid = details.querySelector('.np-specialty-grid');
    buttons.forEach(function (button) { grid.appendChild(button); });
    scopeGrid.appendChild(details);
  }

  function selectedServiceIds() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-service][aria-pressed="true"]'))
      .map(function (button) { return button.getAttribute('data-service'); })
      .filter(function (id) { return Boolean(GUIDES[id]); });
  }

  function capturedSlots() {
    return Array.prototype.slice.call(document.querySelectorAll('#evidenceGrid [data-slot].has-photo'));
  }

  function photoCountForGuide(guideId) {
    return capturedSlots().filter(function (slot) {
      var tag = photoTags[slot.getAttribute('data-slot')];
      return tag && tag.guideId === guideId;
    }).length;
  }

  function capturedSlotForPrompt(guideId, promptIndex) {
    var slots = capturedSlots();
    for (var index = 0; index < slots.length; index += 1) {
      var slotIndex = slots[index].getAttribute('data-slot');
      var tag = photoTags[slotIndex];
      if (tag && tag.guideId === guideId && String(tag.promptIndex) === String(promptIndex)) return slots[index];
    }
    return null;
  }

  function renderPlanner() {
    var planner = document.getElementById('npPhotoPlanner');
    if (!planner) return;
    var ids = selectedServiceIds();
    var rows = ['property_overview'].concat(ids).map(function (id) {
      var guide = GUIDES[id];
      var count = photoCountForGuide(id);
      return '<div class="np-plan-service"><div><strong>' + escapeHtml(guide.title) + '</strong><span>' + count + ' photo' + (count === 1 ? '' : 's') + ' · tap to add or review</span></div><button class="np-plan-button" type="button" data-np-open="' + escapeHtml(id) + '">' + (count ? 'Review' : 'Add photos') + '</button></div>';
    }).join('');

    planner.innerHTML = '<div class="np-plan-head"><div><h3>Quick Quote Photo Plan</h3><p>Select a service above, take the useful views, skip what does not apply, and scan when ready.</p></div><span class="np-plan-count">' + capturedSlots().length + ' / ' + MAX_PHOTOS + ' photos</span></div><div class="np-plan-list">' + rows + '</div>' + (ids.length ? '' : '<p class="np-capture-copy">No service selected yet. Start with the property overview or choose a service above.</p>') + '<button class="np-review-button" type="button" data-np-review>' + (document.body.classList.contains('np-photo-review-open') ? 'Hide all photos' : 'Review all photos') + '</button>';
    document.dispatchEvent(new CustomEvent('np:quote-evidence-changed'));
  }

  function renderGuide() {
    var guide = GUIDES[activeGuide] || GUIDES.property_overview;
    var screen = document.getElementById('npCaptureScreen');
    if (!screen) return;
    document.getElementById('npGuideCategory').textContent = guide.category;
    document.getElementById('npGuideTitle').textContent = guide.title;
    document.getElementById('npGuideCopy').textContent = guide.copy;
    renderGuideSwitch();
    document.getElementById('npGuideWarning').innerHTML = guide.warning ? '<p class="np-capture-warning">' + escapeHtml(guide.warning) + '</p>' : '';

    var values = measurements[activeGuide] || {};
    document.getElementById('npGuideFields').innerHTML = guide.fields.map(function (field) {
      return '<label class="np-measure-field">' + escapeHtml(field[1]) + '<input type="' + escapeHtml(field[2]) + '" inputmode="' + (field[2] === 'number' ? 'decimal' : 'text') + '" data-np-field="' + escapeHtml(field[0]) + '" value="' + escapeHtml(values[field[0]] || '') + '" placeholder="' + escapeHtml(field[3]) + '"></label>';
    }).join('');

    document.getElementById('npPromptList').innerHTML = guide.prompts.map(function (prompt, index) {
      var captured = capturedSlotForPrompt(activeGuide, index);
      var skipKey = activeGuide + ':' + index;
      var skipped = skippedViews[skipKey] === true;
      return '<article class="np-prompt' + (captured ? ' is-captured' : '') + (skipped ? ' is-skipped' : '') + '"><div><strong>' + escapeHtml(prompt[0]) + '</strong><p>' + escapeHtml(prompt[1]) + '</p>' + (captured ? '<p class="np-prompt-status">✓ Photo added</p>' : skipped ? '<p class="np-prompt-status">Skipped — optional</p>' : '') + '</div><div class="np-prompt-actions"><button class="np-capture-button" type="button" data-np-take="' + index + '">' + (captured ? 'Replace' : 'Take photo') + '</button><button class="np-skip-button" type="button" data-np-skip="' + index + '">' + (skipped ? 'Undo skip' : 'Skip') + '</button></div></article>';
    }).join('');
  }

  function renderGuideSwitch() {
    var select = document.getElementById('npGuideSwitch');
    if (!select) return;
    var multiLevel = document.body.getAttribute('data-building-level') === 'multiple';
    function optionsFor(ids) {
      return ids.map(function (id) {
        var isRoofLocked = id === 'roof_soft_wash' && !multiLevel;
        var label = GUIDES[id].title + (isRoofLocked ? ' — select Multiple levels first' : '');
        return '<option value="' + escapeHtml(id) + '"' + (id === activeGuide ? ' selected' : '') + (isRoofLocked ? ' disabled' : '') + '>' + escapeHtml(label) + '</option>';
      }).join('');
    }
    select.innerHTML = '<optgroup label="Home and property">' + optionsFor(STANDARD_GUIDES) + '</optgroup><optgroup label="Specialty and commercial">' + optionsFor(SPECIALTY_GUIDES) + '</optgroup>';
    Array.prototype.forEach.call(document.querySelectorAll('[data-np-level]'), function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-np-level') === (multiLevel ? 'multiple' : 'one')));
    });
  }

  function openGuide(id) {
    if (!GUIDES[id]) return;
    activeGuide = id;
    renderGuide();
    var screen = document.getElementById('npCaptureScreen');
    screen.hidden = false;
    document.body.classList.add('np-capture-open');
    screen.scrollTop = 0;
  }

  function closeGuide() {
    var screen = document.getElementById('npCaptureScreen');
    if (screen) screen.hidden = true;
    document.body.classList.remove('np-capture-open');
    renderPlanner();
  }

  function nextEmptySlot() {
    return document.querySelector('#evidenceGrid [data-slot]:not(.has-photo)');
  }

  function showNotice(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }

  function takeGuidePhoto(promptIndex, promptTitle) {
    var slot = capturedSlotForPrompt(activeGuide, promptIndex) || nextEmptySlot();
    if (!slot) {
      showNotice('This quote already has the maximum 24 photos. Remove one from Review All Photos to replace it.');
      return;
    }
    var slotIndex = slot.getAttribute('data-slot');
    photoTags[slotIndex] = { guideId: activeGuide, promptIndex: promptIndex, title: promptTitle };
    skippedViews[activeGuide + ':' + promptIndex] = false;
    slot.click();
  }

  function addSavedPhotos() {
    var empty = Array.prototype.slice.call(document.querySelectorAll('#evidenceGrid [data-slot]:not(.has-photo)'));
    if (!empty.length) {
      showNotice('This quote already has the maximum 24 photos.');
      return;
    }
    pendingSavedGuide = { guideId: activeGuide, emptyIndexes: empty.map(function (slot) { return slot.getAttribute('data-slot'); }) };
    var uploadButton = document.getElementById('uploadButton');
    if (uploadButton) uploadButton.click();
  }

  function handleSavedInput(event) {
    if (!pendingSavedGuide) return;
    var count = Math.min((event.target.files || []).length, pendingSavedGuide.emptyIndexes.length);
    for (var index = 0; index < count; index += 1) {
      var slotIndex = pendingSavedGuide.emptyIndexes[index];
      photoTags[slotIndex] = { guideId: pendingSavedGuide.guideId, promptIndex: 'saved-' + Date.now() + '-' + index, title: 'Saved photo' };
    }
    pendingSavedGuide = null;
  }

  function handlePlannerClick(event) {
    var open = event.target.closest('[data-np-open]');
    if (open) openGuide(open.getAttribute('data-np-open'));
    var review = event.target.closest('[data-np-review]');
    if (review) {
      document.body.classList.toggle('np-photo-review-open');
      renderPlanner();
    }
  }

  function handleCaptureClick(event) {
    var level = event.target.closest('[data-np-level]');
    if (level) {
      var buildingButton = document.querySelector('[data-building-level="' + level.getAttribute('data-np-level') + '"]');
      if (buildingButton && buildingButton.getAttribute('aria-pressed') !== 'true') buildingButton.click();
      renderGuideSwitch();
      return;
    }
    if (event.target.closest('[data-np-close]')) {
      closeGuide();
      return;
    }
    var take = event.target.closest('[data-np-take]');
    if (take) {
      var index = Number(take.getAttribute('data-np-take'));
      takeGuidePhoto(index, GUIDES[activeGuide].prompts[index][0]);
      return;
    }
    var skip = event.target.closest('[data-np-skip]');
    if (skip) {
      var skipIndex = Number(skip.getAttribute('data-np-skip'));
      var key = activeGuide + ':' + skipIndex;
      skippedViews[key] = !skippedViews[key];
      renderGuide();
      return;
    }
    if (event.target.closest('[data-np-saved]')) {
      addSavedPhotos();
      return;
    }
    if (event.target.closest('[data-np-extra]')) {
      takeGuidePhoto('extra-' + Date.now(), 'Extra detail');
    }
  }

  function handleMeasurementInput(event) {
    var field = event.target.closest('[data-np-field]');
    if (!field) return;
    measurements[activeGuide] = measurements[activeGuide] || {};
    measurements[activeGuide][field.getAttribute('data-np-field')] = field.value;
    document.dispatchEvent(new CustomEvent('np:quote-evidence-changed'));
  }

  function quickQuoteSnapshot() {
    var counts = {};
    capturedSlots().forEach(function (slot) {
      var tag = photoTags[slot.getAttribute('data-slot')];
      var guideId = tag && tag.guideId ? tag.guideId : 'unassigned';
      counts[guideId] = (counts[guideId] || 0) + 1;
    });
    var titles = {};
    Object.keys(GUIDES).forEach(function (id) { titles[id] = GUIDES[id].title; });
    return {
      selectedServiceIds: selectedServiceIds(),
      photoCount: capturedSlots().length,
      photoCounts: counts,
      measurements: JSON.parse(JSON.stringify(measurements)),
      skippedViews: JSON.parse(JSON.stringify(skippedViews)),
      guideTitles: titles,
      buildingLevel: document.body.getAttribute('data-building-level') === 'multiple' ? 'multiple' : 'one'
    };
  }

  function handleGuideChange(event) {
    var select = event.target.closest('#npGuideSwitch');
    if (!select) return;
    var id = select.value;
    if (id === 'property_overview') {
      openGuide(id);
      return;
    }
    var button = document.querySelector('[data-service="' + id + '"]');
    if (!button) return;
    if (button.getAttribute('aria-pressed') !== 'true') {
      button.click();
    } else {
      openGuide(id);
    }
  }

  function updateSlotBadges() {
    Array.prototype.forEach.call(document.querySelectorAll('#evidenceGrid [data-slot]'), function (slot) {
      var slotIndex = slot.getAttribute('data-slot');
      var tag = photoTags[slotIndex];
      var badge = slot.querySelector('.np-slot-tag');
      if (!slot.classList.contains('has-photo') || !tag) {
        if (badge) badge.remove();
        return;
      }
      var guide = GUIDES[tag.guideId] || GUIDES.custom_area;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'np-slot-tag';
        slot.appendChild(badge);
      }
      badge.textContent = guide.title + ' · ' + tag.title;
      var title = slot.querySelector('.slot-title');
      if (title) title.textContent = tag.title;
    });
  }

  function photoEvidencePayload() {
    return capturedSlots().map(function (slot) {
      var slotIndex = slot.getAttribute('data-slot');
      var tag = photoTags[slotIndex] || { guideId: 'unassigned', promptIndex: 'unknown', title: 'Unassigned photo' };
      return { slot: Number(slotIndex) + 1, serviceId: tag.guideId, view: tag.title };
    });
  }

  function measurementSummary() {
    var lines = [];
    Object.keys(measurements).forEach(function (guideId) {
      var values = measurements[guideId] || {};
      var parts = Object.keys(values).filter(function (key) { return String(values[key] || '').trim(); }).map(function (key) {
        return key + ': ' + String(values[key]).trim();
      });
      if (parts.length) lines.push((GUIDES[guideId] ? GUIDES[guideId].title : guideId) + ' — ' + parts.join(', '));
    });
    return lines;
  }

  function patchAnalysisRequest() {
    if (window.__npQuickQuoteFetchPatched || typeof window.fetch !== 'function') return;
    var originalFetch = window.fetch.bind(window);
    window.__npQuickQuoteFetchPatched = true;
    window.fetch = function (resource, options) {
      var url = typeof resource === 'string' ? resource : resource && resource.url;
      var requestOptions = options;
      if (url && /\/api\/analyze(?:\?|$)/.test(url) && options && typeof options.body === 'string') {
        try {
          var payload = JSON.parse(options.body);
          var evidence = photoEvidencePayload();
          var skipped = Object.keys(skippedViews).filter(function (key) { return skippedViews[key]; });
          var notes = ['GUIDED QUICK QUOTE EVIDENCE:', evidence.map(function (item) { return 'Photo ' + item.slot + ': ' + item.serviceId + ' / ' + item.view; }).join('; ') || 'No photo tags available.'];
          var measurementLines = measurementSummary();
          if (measurementLines.length) notes.push('OPTIONAL FIELD MEASUREMENTS: ' + measurementLines.join(' | '));
          if (skipped.length) notes.push('INTENTIONALLY SKIPPED OPTIONAL VIEWS: ' + skipped.join(', '));
          payload.photoEvidence = evidence;
          payload.measurements = measurements;
          payload.siteNotes = notes.join('\n') + (payload.siteNotes ? '\n\n' + payload.siteNotes : '');
          requestOptions = Object.assign({}, options, { body: JSON.stringify(payload) });
        } catch (error) {
          requestOptions = options;
        }
      }
      return originalFetch(resource, requestOptions);
    };
  }

  function bindServiceChips() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-service]'), function (button) {
      button.addEventListener('click', function () {
        requestAnimationFrame(function () {
          renderPlanner();
          var id = button.getAttribute('data-service');
          if (button.getAttribute('aria-pressed') === 'true' && GUIDES[id]) openGuide(id);
        });
      });
    });
  }

  function observeEvidence() {
    var grid = document.getElementById('evidenceGrid');
    if (!grid || typeof MutationObserver !== 'function') return;
    var observer = new MutationObserver(function () {
      updateSlotBadges();
      renderPlanner();
      var screen = document.getElementById('npCaptureScreen');
      if (screen && !screen.hidden) renderGuide();
    });
    observer.observe(grid, { childList: true });
  }

  function init() {
    installStyles();
    createSpecialtyGroup();
    createInterface();
    bindServiceChips();
    observeEvidence();
    patchAnalysisRequest();
    var uploadInput = document.getElementById('uploadInput');
    if (uploadInput) uploadInput.addEventListener('change', handleSavedInput);
    window.NPQuickQuote = {
      getState: quickQuoteSnapshot,
      openGuide: openGuide
    };
    updateSlotBadges();
    renderPlanner();
  }

  init();
})();
