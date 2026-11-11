import type {
  DmuStakeholderCard,
  FixtureHotspot,
  ShopperScenario,
  StageBlueprint
} from './types';

export const STAGE_BLUEPRINTS: StageBlueprint[] = [
  {
    id: 'stage1-portable',
    tabLabel: 'Stage 1 · Portable Rack Study',
    badgeText: 'Immediate Discovery Gate (A1–A2) · Zero Tech Integration [A]',
    evidenceTag: 'A',
    headline: 'Portable human-assisted comparison beside the rack, with zero data capture.',
    summary:
      'Before investing in store hardware or IT approvals, Stage 1 tests whether explained color guidance changes real garment selection at the rack. A trained specialist or associate uses physical fabric drapes and a curated 6-garment rail to connect a seasonal palette to 2–3 tops in stock.',
    physicalFootprint:
      '0.8 m² movable garment rail + physical fabric swatch book + clip-on neutral CRI 95+ daylight lamp. No fixed wiring or POS connection.',
    shopperFlow:
      'Voluntary aisle invitation → 90-second physical fabric drape comparison → plain-language explanation → 2–3 tops pulled from the rack → free choice to try on, reject, or declare no result.',
    associateRole:
      'Facilitates the comparison in under 3 minutes, explains why specific hues work against skin contrast, and explicitly welcomes disagreement or a no-result exit.',
    dataPrivacyRule:
      'Strict zero-capture protocol: no camera photos, no stored profiles, no email/phone collection, no CRM export, and no transaction linkage.',
    commercialGate:
      'Decision Gate A1: Continue only if >= 4/5 shoppers select or want to try a suggested garment, median trust >= 4/5, and <= 1 report feeling pressured.',
    dmuOwner: 'Product & UX Research Lead with Apparel Merchandising permission [A]',
    fixtureCallouts: {
      topSignage: '"Unsure which color works beyond black or beige? Compare 3 tops on this rack — optional, 2 minutes, no photos."',
      stationHardware: 'Physical swatch drape board + printed reference card (no screen required during initial 5-shopper observation).',
      rackStockRule: 'Pre-selected capsule of 6 in-stock tops across 3 color families, verified at shift start.',
      fallbackProtocol: 'Immediate human pivot: if store lighting is mixed or shopper disagrees, hand over familiar neutral options with zero friction.'
    }
  },
  {
    id: 'stage2-station',
    tabLabel: 'Stage 2 · Differentiated In-Store Station',
    badgeText: 'Conditional Recommendation (Deliverable 6) · Maximum Learning per Dependency [A]',
    evidenceTag: 'A',
    headline: 'A dedicated rack-side touch station that connects explained palettes to live store stock.',
    summary:
      'Recommended in Deliverable 6 once A1–A3 pass: a compact fixture mounted directly to a featured apparel rack. It combines calibrated neutral illumination, physical fabric comparison tabs, and an interactive touch screen that points the shopper to 2–3 exact hooks and available sizes on that rack.',
    physicalFootprint:
      '1.2 m² end-cap or feature rack bay + 12" angled touch terminal + upper CRI 95+ daylight canopy + 4 physical fabric comparison drapes.',
    shopperFlow:
      'Tap to start at the rack (no login) → compare physical drape under neutral light → read plain-language palette rationale → pick 1–3 tops from Hooks 01–06 → take ephemeral rack pass to fitting room.',
    associateRole:
      'Assisted B2B2C delivery: associate receives a visual hook cue when requested, refreshes rack stock at shift intervals, and handles mixed-lighting / no-result escalations.',
    dataPrivacyRule:
      'Ephemeral session only: no facial biometric storage and no mandatory account creation. Screen auto-resets 15 seconds after garment selection or exit.',
    commercialGate:
      'Decision Gates A2–A5: >= 80% agreement with two independent color specialists, <= 15 pp coverage gap, written Operations owner, and positive unit contribution within measured store capacity.',
    dmuOwner: 'Buyer: Apparel Merchandising / Buying [A] · Operations: Store Associates [A]',
    fixtureCallouts: {
      topSignage: '"Test color clarity at the rack. See why 3 available tops work for your contrast — or skip anytime."',
      stationHardware: '12" anti-glare touch display (45° ergonomic tilt) + physical fabric swatch bar mounted below the bezel.',
      rackStockRule: 'Hooks 01–06 mapped to live store SKU availability; out-of-stock cuts are suppressed before session start.',
      fallbackProtocol: 'First-class "Unclear / No Result" button routes to human associate drape check or clean exit without forced advice.'
    }
  },
  {
    id: 'stage3-makeup-champion',
    tabLabel: 'Future Scope · Makeup Champion Bridge [A]',
    badgeText: 'Cross-Category Advocacy Hypothesis · Unvalidated Expansion Scope [A]',
    evidenceTag: 'A',
    headline: 'Apparel owns the initial purchase; Makeup / Beauty champions the cross-category opportunity.',
    summary:
      'In the v12 Decision-Making Unit [A], Makeup / Beauty acts as the internal champion because undertone and contrast guidance naturally bridges clothing and cosmetics. However, apparel remains the first commercial scope: shade matching and cross-category demand require a separate validation gate.',
    physicalFootprint:
      'Apparel station positioned on the primary boundary aisle between Women’s Apparel and the Beauty / Cosmetics floor.',
    shopperFlow:
      'Complete apparel rack comparison first → optional cross-category takeaway card showing general undertone family (warm/cool/neutral-soft) to discuss with a Beauty Counter specialist.',
    associateRole:
      'Apparel associate owns rack handoff; Beauty specialist acts as internal advocate and qualitative feedback partner during pilot review.',
    dataPrivacyRule:
      'No automated shade-matching camera claims and no cross-division profile database in the initial pilot.',
    commercialGate:
      'Appendix F Gate: Explicit Makeup champion advocacy and access to color specialists, while commercial budget signatory remains with Apparel Buying + Finance [A].',
    dmuOwner: 'Buyer: Apparel Merchandising [A] · Champion: Makeup / Beauty Division [A]',
    fixtureCallouts: {
      topSignage: '"Apparel first: find your garment palette here. Ask our Beauty counter how your undertone translates to lip & cheek families [A]."',
      stationHardware: 'Apparel rack station with optional printed undertone bridge card (no automated cosmetic shade scanner).',
      rackStockRule: '100% anchored in available tops/shirts on the apparel rack; zero unverified cosmetic SKU claims.',
      fallbackProtocol: 'Scope guardrail banner reminds shoppers and staff that cosmetic shade matching requires in-person testing at the beauty counter.'
    }
  }
];

export const FIXTURE_HOTSPOTS: FixtureHotspot[] = [
  {
    id: 'lighting-bar',
    code: '01',
    title: 'Neutral Daylight Canopy (CRI 95+ · 5000K)',
    physicalSpec: 'Overhead diffused LED bar eliminating harsh yellow/fluorescent retail color casts at the rack.',
    stage1Behavior: 'Clip-on portable daylight lamp positioned above the comparison mirror.',
    stage2Behavior: 'Integrated canopy bar with ambient cast sensor that warns when surrounding store spotlights skew perception.',
    evidenceTag: 'A',
    evidenceNote: 'Addresses Appendix E quality gate: prevents misleading recommendations caused by uneven store lighting.'
  },
  {
    id: 'drape-rail',
    code: '02',
    title: 'Physical Fabric Comparison Drapes',
    physicalSpec: 'Four tactile textile tabs (Cool Berry/Navy vs. Warm Terracotta/Olive) mounted directly below the mirror/screen.',
    stage1Behavior: 'Specialist holds two physical fabric swatches near the shopper’s collarbone for direct visual comparison.',
    stage2Behavior: 'Shopper flips two physical textile tabs beside the screen so the explanation is anchored in real fabric, not a camera filter.',
    evidenceTag: 'O',
    evidenceNote: 'Grounded in E4 survey finding [O]: shoppers trust visible comparison and clear reasoning over opaque algorithmic verdicts.'
  },
  {
    id: 'touch-terminal',
    code: '03',
    title: '12" Rack-Side Guidance Terminal',
    physicalSpec: 'Matte anti-glare display angled at 45° at 115 cm height (wheelchair & standing accessible). Zero camera lens.',
    stage1Behavior: 'Omitted or used by researcher only for timing; Stage 1 relies on direct human explanation.',
    stage2Behavior: 'Runs the 4-step self-contained Color-Play flow: scenario selection → explained palette → 2–3 rack hooks → safe exit.',
    evidenceTag: 'A',
    evidenceNote: 'Designed around Product Principle #1: shopper agency before automation or data accumulation.'
  },
  {
    id: 'curated-rack',
    code: '04',
    title: 'Color-Indexed Garment Rail (Hooks 01–06)',
    physicalSpec: 'Standard retail hanging bar divided into 6 numbered hook bays with tactile color-coded collar tags.',
    stage1Behavior: 'Portable rack holding 6 pre-verified tops/shirts in current store sizes.',
    stage2Behavior: 'Live merchandising bay curated with Apparel Buying [A]; terminal highlights exact Hook # and available sizes.',
    evidenceTag: 'O',
    evidenceNote: 'Solves E1–E3 [O]: 8/9 respondents default to familiar black/white/beige; connecting palette to immediate stock unlocks try-on.'
  },
  {
    id: 'qr-handoff',
    code: '05',
    title: 'Ephemeral Fitting-Room Pass / Safe Exit Strip',
    physicalSpec: 'Local offline QR / printed hook slip showing only the 2–3 chosen Hook IDs and palette rationale.',
    stage1Behavior: 'Paper slip handed to the shopper to bring into the fitting room; discarded after try-on.',
    stage2Behavior: 'Zero-network local QR encoding only the palette summary and Hook IDs—no login, no phone number, no CRM tracking.',
    evidenceTag: 'A',
    evidenceNote: 'Respects Deliverable 5 Customer Analysis: keeps the rack handoff while deferring capture and profile saving.'
  }
];

export const SHOPPER_SCENARIOS: ShopperScenario[] = [
  {
    id: 'cool-winter',
    label: 'High Contrast · Cool Undertone',
    lightingCondition: 'Calibrated 5000K rack canopy · Crisp contrast visible',
    lightingStatus: 'calibrated',
    undertoneSummary: 'Cool / Blue-rose undertone with high hair-to-skin value contrast',
    confidenceNote: 'Direct specialist agreement target >= 80% [A, Appendix E]',
    defaultHabitQuote:
      '"I almost always grab black or white tops because bold colors feel risky under store lights." — Survey pattern E1 [O: 8/9 choose familiar colors]',
    paletteTitle: 'Cool Fuchsia, Deep Plum & Icy Lilac',
    explanation:
      'High-contrast cool complexions look washed out against muted yellow-beige, but gain immediate definition next to saturated blue-based pinks, deep berry, and crisp ink navy.',
    swatches: [
      {
        name: 'Orchid Fuchsia',
        hex: '#B80A6B',
        role: 'Statement Top',
        contrastNote: 'Matches natural lip/cheek contrast without yellow cast'
      },
      {
        name: 'Deep Ink Plum',
        hex: '#201B27',
        role: 'Structured Neutral',
        contrastNote: 'Softer and richer than flat jet black under retail LEDs'
      },
      {
        name: 'Cool Lavender Mist',
        hex: '#D5B8D7',
        role: 'Light Layer',
        contrastNote: 'Replaces warm cream/ecru that dulls cool undertones'
      },
      {
        name: 'Cobalt Slate',
        hex: '#244E91',
        role: 'Everyday Collar Hue',
        contrastNote: 'Sharpens jawline and eye clarity in daylight'
      }
    ],
    avoidSwatches: [
      {
        name: 'Mustard Ochre',
        hex: '#C8963E',
        reason: 'Adds a sallow yellow reflection against cool skin contrast'
      },
      {
        name: 'Warm Camel Beige',
        hex: '#D2B48C',
        reason: 'Blurs collar boundary and reduces natural contrast'
      }
    ],
    rackGarments: [
      {
        sku: 'CP-TOP-104',
        title: 'Poplin Oversized Shirt · Orchid Fuchsia',
        cut: 'Relaxed collar shirt · 100% cotton poplin',
        hookLocation: 'Rack Bay A · Hook 01',
        swatchName: 'Orchid Fuchsia',
        swatchHex: '#B80A6B',
        secondaryHex: '#FCECF5',
        sizesAvailable: ['XS', 'S', 'M', 'L'],
        fabricNote: 'Crisp matte weave reflects true blue-red pigment without synthetic sheen.',
        whyItWorks: 'Provides the high value contrast you usually seek in black, while lifting facial brightness.',
        habitAlternative: 'Instead of your usual flat black shirt [O, E1]'
      },
      {
        sku: 'CP-TOP-108',
        title: 'Ribbed Boat-Neck Knit · Cool Lavender',
        cut: 'Fitted collarbone knit · Viscose-nylon blend',
        hookLocation: 'Rack Bay A · Hook 03',
        swatchName: 'Cool Lavender Mist',
        swatchHex: '#D5B8D7',
        secondaryHex: '#EEE7EF',
        sizesAvailable: ['S', 'M', 'L'],
        fabricNote: 'Fine rib texture holds cool lilac tone evenly across the shoulder line.',
        whyItWorks: 'Gives a clean light-neutral alternative to warm beige or off-white tops that often get discarded later [O, E1].',
        habitAlternative: 'Instead of warm ecru / beige knitwear'
      },
      {
        sku: 'CP-TOP-112',
        title: 'Fluid Satin Wrap Blouse · Cobalt Slate',
        cut: 'V-neck drape blouse · Recycled matte satin',
        hookLocation: 'Rack Bay A · Hook 05',
        swatchName: 'Cobalt Slate',
        swatchHex: '#244E91',
        secondaryHex: '#E6EEF8',
        sizesAvailable: ['XS', 'S', 'M'],
        fabricNote: 'Low-luster satin deepens cool blue pigment without harsh specular glare.',
        whyItWorks: 'Frames the collarbone with cool depth—easy to pair with existing dark denim or grey tailoring.',
        habitAlternative: 'Instead of standard charcoal grey'
      }
    ]
  },
  {
    id: 'warm-autumn',
    label: 'Medium Contrast · Warm Undertone',
    lightingCondition: 'Calibrated 5000K rack canopy · Golden warmth balanced',
    lightingStatus: 'calibrated',
    undertoneSummary: 'Warm / Golden-peach undertone with medium earthy contrast',
    confidenceNote: 'Direct specialist agreement target >= 80% [A, Appendix E]',
    defaultHabitQuote:
      '"I buy white or grey basics in store, then at home I feel they make me look tired so I never wear them." — Survey pattern E1 [O: 7/9 discard garments]',
    paletteTitle: 'Spiced Terracotta, Warm Olive & Amber Honey',
    explanation:
      'Warm golden undertones harmonize with rich, earth-anchored pigments. Stark optic white or icy blue-greys create a cold halo at the neckline, whereas terracotta, olive, and warm rose bring immediate balance.',
    swatches: [
      {
        name: 'Spiced Terracotta',
        hex: '#B84A27',
        role: 'Statement Top',
        contrastNote: 'Echoes natural golden warmth without overpowering skin'
      },
      {
        name: 'Warm Botanical Olive',
        hex: '#4A5D3F',
        role: 'Core Neutral',
        contrastNote: 'Replaces cold black/charcoal with grounded depth'
      },
      {
        name: 'Amber Honey',
        hex: '#81530E',
        role: 'Rich Accent',
        contrastNote: 'Enhances warm eye and hair highlights'
      },
      {
        name: 'Warm Peach Linen',
        hex: '#E8C5B0',
        role: 'Light Base',
        contrastNote: 'Harmonizes better than stark optic white'
      }
    ],
    avoidSwatches: [
      {
        name: 'Icy Optic White',
        hex: '#F4F8FF',
        reason: 'Creates a stark cold contrast that washes out warm complexions'
      },
      {
        name: 'Cool Magenta',
        hex: '#D01080',
        reason: 'Clashes with golden undertone at the collarbone'
      }
    ],
    rackGarments: [
      {
        sku: 'CP-TOP-201',
        title: 'Washed Linen Utility Shirt · Spiced Terracotta',
        cut: 'Open collar shirt · Linen-cotton blend',
        hookLocation: 'Rack Bay B · Hook 02',
        swatchName: 'Spiced Terracotta',
        swatchHex: '#B84A27',
        secondaryHex: '#FDF1EC',
        sizesAvailable: ['S', 'M', 'L'],
        fabricNote: 'Slub linen texture softens the terracotta pigment for effortless daytime wear.',
        whyItWorks: 'Adds vibrant warmth right at the collar without feeling loud or artificial.',
        habitAlternative: 'Instead of stark optic white shirts [O, E1]'
      },
      {
        sku: 'CP-TOP-204',
        title: 'Structured Crew Tee · Warm Botanical Olive',
        cut: 'Heavyweight boxy tee · Organic cotton',
        hookLocation: 'Rack Bay B · Hook 04',
        swatchName: 'Warm Botanical Olive',
        swatchHex: '#4A5D3F',
        secondaryHex: '#EFF3EC',
        sizesAvailable: ['XS', 'S', 'M', 'L'],
        fabricNote: 'Dense jersey knit keeps the olive tone rich and opaque.',
        whyItWorks: 'Works exactly like a neutral black tee in your wardrobe, but prevents dark shadows under the chin.',
        habitAlternative: 'Instead of default black or cool grey tees'
      },
      {
        sku: 'CP-TOP-209',
        title: 'Soft Pleated Camisole · Warm Peach Linen',
        cut: 'Square-neck layering top · Woven modal',
        hookLocation: 'Rack Bay B · Hook 06',
        swatchName: 'Warm Peach Linen',
        swatchHex: '#E8C5B0',
        secondaryHex: '#FAF3EE',
        sizesAvailable: ['XS', 'S', 'M'],
        fabricNote: 'Warm undertone base that blends naturally with golden skin tones.',
        whyItWorks: 'Eliminates the "looks different at home" regret common with cold white tops [O, E1].',
        habitAlternative: 'Instead of cool bright white basics'
      }
    ]
  },
  {
    id: 'soft-summer',
    label: 'Soft Contrast · Neutral-Cool',
    lightingCondition: 'Calibrated 5000K rack canopy · Soft tonal gradient',
    lightingStatus: 'calibrated',
    undertoneSummary: 'Neutral-cool undertone with gentle, blended contrast',
    confidenceNote: 'Direct/adjacent specialist agreement target >= 80% [A, Appendix E]',
    defaultHabitQuote:
      '"Bright neon racks overwhelm me, so I retreat to plain grey even when I want something new." — Survey pattern E1–E2 [O]',
    paletteTitle: 'Dusty Rose, Mauve Plum & Sage Slate',
    explanation:
      'When your natural contrast is soft and blended, ultra-saturated neon or harsh jet black overpowers your features first. Dusty rose, muted plum, and sage slate create effortless harmony.',
    swatches: [
      {
        name: 'Dusty Rose Silk',
        hex: '#D999BE',
        role: 'Primary Soft Hue',
        contrastNote: 'Gentle rose tone that never overwhelms soft features'
      },
      {
        name: 'Muted Mauve',
        hex: '#BDA9CE',
        role: 'Cool Mid-Tone',
        contrastNote: 'Bridges cool pink and soft slate grey effortlessly'
      },
      {
        name: 'Sage Slate',
        hex: '#6E7F78',
        role: 'Soft Neutral',
        contrastNote: 'Calmer alternative to harsh black or bright navy'
      },
      {
        name: 'Rosewater Quartz',
        hex: '#E5BED1',
        role: 'Light Layer',
        contrastNote: 'Adds subtle warmth without turning yellow'
      }
    ],
    avoidSwatches: [
      {
        name: 'Electric Neon Orange',
        hex: '#FF5500',
        reason: 'Overpowers soft natural contrast before the garment cut is noticed'
      },
      {
        name: 'Stark Jet Black',
        hex: '#08080A',
        reason: 'Creates a harsh neckline boundary on soft-contrast features'
      }
    ],
    rackGarments: [
      {
        sku: 'CP-TOP-302',
        title: 'Draped Modal Blouse · Dusty Rose',
        cut: 'Soft cowl neck · Tencel modal',
        hookLocation: 'Rack Bay A · Hook 02',
        swatchName: 'Dusty Rose Silk',
        swatchHex: '#D999BE',
        secondaryHex: '#FCECF5',
        sizesAvailable: ['XS', 'S', 'M', 'L'],
        fabricNote: 'Fluid matte drape prevents harsh reflections and keeps the rose hue understated.',
        whyItWorks: 'Lets you wear color with the same low-risk comfort as a neutral top.',
        habitAlternative: 'Instead of plain heather grey tops'
      },
      {
        sku: 'CP-TOP-305',
        title: 'Fine Cardigan Top · Muted Mauve',
        cut: 'Button-front knit · Merino-cotton blend',
        hookLocation: 'Rack Bay A · Hook 04',
        swatchName: 'Muted Mauve',
        swatchHex: '#BDA9CE',
        secondaryHex: '#F5F2F7',
        sizesAvailable: ['S', 'M', 'L'],
        fabricNote: 'Brushed yarn softens the color transition at the collarbone.',
        whyItWorks: 'Pairs seamlessly with denim while avoiding the wash-out of pale beige.',
        habitAlternative: 'Instead of oatmeal or pale grey knits'
      },
      {
        sku: 'CP-TOP-309',
        title: 'Tailored Mandarin Shirt · Sage Slate',
        cut: 'Relaxed sleeve shirt · Brushed cotton',
        hookLocation: 'Rack Bay A · Hook 06',
        swatchName: 'Sage Slate',
        swatchHex: '#6E7F78',
        secondaryHex: '#EEF2F0',
        sizesAvailable: ['XS', 'S', 'M'],
        fabricNote: 'Muted blue-green undertone stays stable in both store and outdoor daylight.',
        whyItWorks: 'Provides a refined dark neutral without the heaviness of black.',
        habitAlternative: 'Instead of harsh black work shirts'
      }
    ]
  },
  {
    id: 'mixed-lighting',
    label: 'Unclear / Mixed Store Lighting (Quality Gate Test)',
    lightingCondition: 'Caution: Warm spotlight spill detected · Confidence below threshold',
    lightingStatus: 'caution',
    undertoneSummary: 'Ambiguous neutral reading — automated verdict suppressed by Quality Gate (Appendix E)',
    confidenceNote: 'Mandatory No-Result / Human Fallback Route [A, Deliverable 5 & Appendix E]',
    defaultHabitQuote:
      '"If a tool guesses wrong or pushes me when it isn’t sure, I lose trust immediately." — Customer Analysis & Trust Gate [O/A]',
    paletteTitle: 'Quality Gate Triggered · No Forced Recommendation',
    explanation:
      'Color-Play never fakes certainty. When ambient store spotlights skew contrast or an undertone sits on a warm/cool boundary, the station explicitly halts automated advice and offers a 60-second human drape check or a zero-pressure exit.',
    swatches: [
      {
        name: 'Balanced Berry Drape',
        hex: '#AD286C',
        role: 'Physical Test Swatch A',
        contrastNote: 'Use physical drape tab 02 to test cool response'
      },
      {
        name: 'Soft Rose Drape',
        hex: '#E9B6C7',
        role: 'Physical Test Swatch B',
        contrastNote: 'Check if soft value reduces spotlight glare'
      },
      {
        name: 'Deep Slate Drape',
        hex: '#494153',
        role: 'Neutral Anchor Swatch',
        contrastNote: 'Safe universal dark neutral across lighting conditions'
      },
      {
        name: 'Muted Sage Drape',
        hex: '#AAB4A6',
        role: 'Universal Mid-Tone',
        contrastNote: 'Low-risk bridge hue while confirming undertone'
      }
    ],
    avoidSwatches: [],
    rackGarments: [
      {
        sku: 'CP-SAFE-401',
        title: 'Universal Mid-Tone Top · Balanced Plum Slate',
        cut: 'Relaxed crew neck · Brushed cotton',
        hookLocation: 'Rack Bay A · Hook 03',
        swatchName: 'Deep Slate Drape',
        swatchHex: '#494153',
        secondaryHex: '#F5F2F7',
        sizesAvailable: ['XS', 'S', 'M', 'L'],
        fabricNote: 'Balanced neutral-plum undertone designed to hold steady in both warm and cool light.',
        whyItWorks: 'Safe fallback option if you want to compare one non-black garment in the fitting room mirror.',
        habitAlternative: 'Optional low-risk comparison piece'
      }
    ]
  }
];

export const DMU_STAKEHOLDERS: DmuStakeholderCard[] = [
  {
    roleLabel: 'Buyer [A] · Commercial Ownership',
    division: 'Apparel Merchandising / Buying',
    evidenceTag: 'A',
    inStoreResponsibility: 'Selects the target apparel category, defines the 6-SKU rack shortlist, and evaluates category sell-through and pilot fee viability.',
    whatTheySeeInSitu: 'A merchandising-First fixture that directs shoppers to full-price seasonal stock already hanging on the rack—not an abstract styling toy.',
    decisionGate: 'Gate A3: Written conditional pilot commitment naming budget owner, category scope, and spending cap.'
  },
  {
    roleLabel: 'Champion [A] · Internal Advocacy',
    division: 'Makeup / Beauty Division',
    evidenceTag: 'A',
    inStoreResponsibility: 'Advocates for cross-category color guidance, connects color specialists for Appendix E quality benchmarking, and explores future beauty counter handoffs.',
    whatTheySeeInSitu: 'A shared undertone vocabulary that starts with low-risk apparel drapes and can later bridge to cosmetic shade families once validated.',
    decisionGate: 'Appendix F: Explicit advocacy and specialist access; Makeup support does not replace Apparel Buying budget authority.'
  },
  {
    roleLabel: 'User · Beneficiary',
    division: 'Fast-Fashion Shopper (Ages 18–28 primary [A])',
    evidenceTag: 'O',
    inStoreResponsibility: 'Uses the station voluntarily at the rack; compares physical fabric swatches, picks 2–3 tops to try on, or exits freely.',
    whatTheySeeInSitu: 'Plain-language reasons why 2–3 tops on that exact rack work for their contrast—with zero camera capture, zero account signup, and a clear "No Result / Skip" button.',
    decisionGate: 'Gate A1 [O/A]: >= 4/5 select or want to try a suggestion, median trust >= 4/5, and <= 1 pressure report.'
  },
  {
    roleLabel: 'Operator [A] · Store Execution',
    division: 'Store Associates & Floor Operations',
    evidenceTag: 'A',
    inStoreResponsibility: 'Invites shoppers without pressure, restocks Hooks 01–06, and steps in when the station flags an unclear/no-result case.',
    whatTheySeeInSitu: 'A 2-minute self-explanatory rack aid that speeds up fitting-room handoffs instead of adding complex tablet troubleshooting.',
    decisionGate: 'Gate A4: Written Operations owner, agreed staff-time limit, and sustainable session throughput.'
  }
];
