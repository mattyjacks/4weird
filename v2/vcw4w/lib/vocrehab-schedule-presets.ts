/**
 * VocRehab Schedule Juggle — geo presets (WA / NH / AK).
 *
 * Purpose: pre-filled SavedAddress lists with plausible lat/lng so the
 *   schedule-juggle game can plan around real-feeling places without any
 *   typing. Pair each preset with its transit-gap table and airport map.
 * Owner: web lane (DS-SJ-04). Pure data, zero imports, zero I/O — safe for
 *   client + server. No browser globals. No secrets. Family houses are
 *   samples only and say so in their notes — no real-person PII.
 *
 * Strengths-first tone preserved throughout: transit gaps and airport
 * distances are planning info, never mistakes.
 */

/** Where a saved address fits in a weekly plan. */
export type SavedAddressCategory =
  | "home"
  | "medical"
  | "grocery"
  | "gym"
  | "theater"
  | "community"
  | "library"
  | "family"
  | "work"
  | "airport";

/** One plannable place with a map pin. Lat/lng are plausible, not surveyed. */
export interface SavedAddress {
  id: string;
  label: string;
  category: SavedAddressCategory;
  address: string;
  lat: number;
  lng: number;
  notes?: string;
}

/** A transit limitation framed as planning info (strengths-first). */
export interface TransitGap {
  id: string;
  label: string;
  detail: string;
}

/** A regional preset: addresses + transit gaps + airport map. */
export interface GeoPreset {
  id: string;
  title: string;
  briefing: string;
  addresses: readonly SavedAddress[];
  transitGaps: readonly TransitGap[];
  airports: readonly SavedAddress[];
}

export const waGeoPreset: GeoPreset = {
  id: "wa",
  title: "Tacoma, WA — home base",
  briefing:
    "You already know your way around Tacoma — that local knowledge is a planning strength. These familiar stops (home, clinics, grocery, gym, theater, library, work) are pre-pinned so you can focus on juggling the week, not typing addresses.",
  addresses: [
    {
      id: "wa-home-westerly",
      label: "Home — Westerly Apartments",
      category: "home",
      address: "815 N J St, Tacoma, WA 98403",
      lat: 47.2658,
      lng: -122.4462,
    },
    {
      id: "wa-medical-tacoma-general",
      label: "Tacoma General Hospital",
      category: "medical",
      address: "315 MLK Jr Way, Tacoma, WA 98405",
      lat: 47.2617,
      lng: -122.4775,
    },
    {
      id: "wa-medical-st-joseph",
      label: "St. Joseph Medical Center",
      category: "medical",
      address: "1708 S Yakima Ave, Tacoma, WA 98405",
      lat: 47.2453,
      lng: -122.459,
    },
    {
      id: "wa-medical-hilltop",
      label: "Hilltop Clinic",
      category: "medical",
      address: "1202 MLK Jr Way, Tacoma, WA 98405",
      lat: 47.253,
      lng: -122.469,
    },
    {
      id: "wa-grocery-fred-meyer",
      label: "Fred Meyer",
      category: "grocery",
      address: "7250 Pacific Ave, Tacoma, WA 98408",
      lat: 47.176,
      lng: -122.434,
    },
    {
      id: "wa-gym-planet-fitness",
      label: "Planet Fitness",
      category: "gym",
      address: "3201 S 23rd St, Tacoma, WA 98405",
      lat: 47.227,
      lng: -122.481,
    },
    {
      id: "wa-theater-regal-lakewood",
      label: "Regal Lakewood",
      category: "theater",
      address: "5721 100th St SW, Lakewood, WA 98499",
      lat: 47.148,
      lng: -122.512,
    },
    {
      id: "wa-community-star-center",
      label: "STAR Center",
      category: "community",
      address: "3873 S 66th St, Tacoma, WA 98409",
      lat: 47.198,
      lng: -122.472,
    },
    {
      id: "wa-library-main",
      label: "Tacoma Public Library — Main",
      category: "library",
      address: "1102 Tacoma Ave S, Tacoma, WA 98402",
      lat: 47.2535,
      lng: -122.438,
    },
    {
      id: "wa-family-mom",
      label: "Mom's house (sample)",
      category: "family",
      address: "Sample address, Tacoma, WA — replace with yours",
      lat: 47.24,
      lng: -122.45,
      notes: "Sample — replace with yours.",
    },
    {
      id: "wa-family-dad",
      label: "Dad's house (sample)",
      category: "family",
      address: "Sample address, Tacoma, WA — replace with yours",
      lat: 47.2,
      lng: -122.44,
      notes: "Sample — replace with yours.",
    },
    {
      id: "wa-family-brother",
      label: "Brother's place (sample)",
      category: "family",
      address: "Sample address, Lakewood, WA — replace with yours",
      lat: 47.16,
      lng: -122.5,
      notes: "Sample — replace with yours.",
    },
    {
      id: "wa-family-friend",
      label: "Friend's place (sample)",
      category: "family",
      address: "Sample address, Tacoma, WA — replace with yours",
      lat: 47.27,
      lng: -122.46,
      notes: "Sample — replace with yours.",
    },
    {
      id: "wa-work-local",
      label: "Work — local site",
      category: "work",
      address: "4502 S Steele St, Tacoma, WA 98409",
      lat: 47.217,
      lng: -122.46,
    },
    {
      id: "wa-work-dc",
      label: "Work — DC office (remote-trip)",
      category: "work",
      address: "200 Constitution Ave NW, Washington, DC 20210",
      lat: 38.892,
      lng: -77.016,
      notes: "Fly-in site — see the airport map below.",
    },
  ],
  transitGaps: [
    {
      id: "wa-gap-evening-bus",
      label: "Evening bus gap",
      detail:
        "Some Pierce Transit routes run less often after 8pm — planning an evening backup ride ahead of time is a strong move.",
    },
    {
      id: "wa-gap-sunday",
      label: "Sunday service gap",
      detail:
        "Sunday buses run on a lighter schedule, so Sunday shifts pair well with a carpool or a ride plan.",
    },
    {
      id: "wa-gap-sea-connector",
      label: "Sea-Tac connector",
      detail:
        "Getting to the airport usually means a bus-to-rail handoff in Seattle — leaving a buffer keeps the trip relaxed.",
    },
  ],
  airports: [
    {
      id: "wa-airport-sea",
      label: "Seattle-Tacoma Intl (SEA)",
      category: "airport",
      address: "17801 International Blvd, SeaTac, WA 98158",
      lat: 47.4502,
      lng: -122.3088,
    },
    {
      id: "wa-airport-tacoma-narrows",
      label: "Tacoma Narrows (TIW)",
      category: "airport",
      address: "1202 26th Ave NW, Gig Harbor, WA 98335",
      lat: 47.2675,
      lng: -122.578,
    },
  ],
};

export const nhGeoPreset: GeoPreset = {
  id: "nh",
  title: "Manchester, NH — Elm Grove",
  briefing:
    "You have already shown you can keep a week organized — that planning strength carries over to a new city. Elm Grove is home base, Elliot Hospital covers medical, and five community stops round out the week.",
  addresses: [
    {
      id: "nh-home-elm-grove",
      label: "Home — Elm Grove",
      category: "home",
      address: "25 E Pearl St, Manchester, NH 03101",
      lat: 42.959,
      lng: -71.439,
    },
    {
      id: "nh-medical-elliot",
      label: "Elliot Hospital",
      category: "medical",
      address: "One Elliot Way, Manchester, NH 03103",
      lat: 42.96,
      lng: -71.426,
    },
    {
      id: "nh-community-library",
      label: "Manchester City Library",
      category: "community",
      address: "405 Pine St, Manchester, NH 03104",
      lat: 42.989,
      lng: -71.431,
    },
    {
      id: "nh-community-ymca",
      label: "Downtown YMCA",
      category: "community",
      address: "30 Mechanic St, Manchester, NH 03101",
      lat: 42.9905,
      lng: -71.463,
    },
    {
      id: "nh-community-hannaford",
      label: "Hannaford Grocery",
      category: "community",
      address: "859 Hanover St, Manchester, NH 03104",
      lat: 42.989,
      lng: -71.43,
    },
    {
      id: "nh-community-theater",
      label: "Chunky's Cinema",
      category: "community",
      address: "707 Huse Rd, Manchester, NH 03103",
      lat: 42.962,
      lng: -71.38,
    },
    {
      id: "nh-community-cashin",
      label: "Cashin Community Center",
      category: "community",
      address: "151 Douglas St, Manchester, NH 03102",
      lat: 42.984,
      lng: -71.475,
    },
  ],
  transitGaps: [
    {
      id: "nh-gap-sunday",
      label: "Sunday bus gap",
      detail:
        "MTA buses run a lighter Sunday schedule — a Sunday backup ride keeps plans flexible.",
    },
    {
      id: "nh-gap-evening",
      label: "Evening service gap",
      detail:
        "Evening routes wind down early, so evening shifts pair well with a carpool plan.",
    },
    {
      id: "nh-gap-boston-connector",
      label: "Boston connector",
      detail:
        "Logan trips usually mean a bus-to-Boston handoff — a buffer makes the travel day easy.",
    },
  ],
  airports: [
    {
      id: "nh-airport-mht",
      label: "Manchester-Boston Regional (MHT)",
      category: "airport",
      address: "1 Airport Rd, Manchester, NH 03103",
      lat: 42.9326,
      lng: -71.4357,
    },
    {
      id: "nh-airport-bos",
      label: "Boston Logan (BOS)",
      category: "airport",
      address: "1 Harborside Dr, Boston, MA 02128",
      lat: 42.3656,
      lng: -71.0096,
    },
  ],
};

export const akGeoPreset: GeoPreset = {
  id: "ak",
  title: "Anchorage, AK — Turnagain",
  briefing:
    "Juggling a week across Anchorage distances is real planning skill — the work you have done so far transfers here. Turnagain is home base, two hospitals cover medical, five community stops fill the week, and the family ring stretches to Wasilla, Eagle River, and Girdwood.",
  addresses: [
    {
      id: "ak-home-turnagain",
      label: "Home — Turnagain",
      category: "home",
      address: "3201 Turnagain St, Anchorage, AK 99517",
      lat: 61.212,
      lng: -149.927,
    },
    {
      id: "ak-medical-alaska-regional",
      label: "Alaska Regional Hospital",
      category: "medical",
      address: "2801 DeBarr Rd, Anchorage, AK 99508",
      lat: 61.21,
      lng: -149.778,
    },
    {
      id: "ak-medical-anmc",
      label: "Alaska Native Medical Center",
      category: "medical",
      address: "4315 Diplomacy Dr, Anchorage, AK 99508",
      lat: 61.19,
      lng: -149.82,
    },
    {
      id: "ak-community-loussac",
      label: "Loussac Library",
      category: "community",
      address: "3600 Denali St, Anchorage, AK 99503",
      lat: 61.197,
      lng: -149.828,
    },
    {
      id: "ak-community-fairview",
      label: "Fairview Rec Center",
      category: "community",
      address: "1121 E 10th Ave, Anchorage, AK 99501",
      lat: 61.218,
      lng: -149.855,
    },
    {
      id: "ak-community-fred-meyer",
      label: "Fred Meyer — Midtown",
      category: "community",
      address: "1000 E Northern Lights Blvd, Anchorage, AK 99508",
      lat: 61.196,
      lng: -149.832,
    },
    {
      id: "ak-community-ymca",
      label: "YMCA — Anchorage",
      category: "community",
      address: "5353 Lake Otis Pkwy, Anchorage, AK 99507",
      lat: 61.178,
      lng: -149.832,
    },
    {
      id: "ak-community-tikahtnu",
      label: "Regal Tikahtnu",
      category: "community",
      address: "100 N Muldoon Rd, Anchorage, AK 99506",
      lat: 61.216,
      lng: -149.74,
    },
    {
      id: "ak-family-wasilla",
      label: "Family — Wasilla (sample)",
      category: "family",
      address: "Sample address, Wasilla, AK — replace with yours",
      lat: 61.5814,
      lng: -149.4393,
      notes: "Sample — replace with yours.",
    },
    {
      id: "ak-family-eagle-river",
      label: "Family — Eagle River (sample)",
      category: "family",
      address: "Sample address, Eagle River, AK — replace with yours",
      lat: 61.3222,
      lng: -149.5677,
      notes: "Sample — replace with yours.",
    },
    {
      id: "ak-family-girdwood",
      label: "Family — Girdwood (sample)",
      category: "family",
      address: "Sample address, Girdwood, AK — replace with yours",
      lat: 60.9407,
      lng: -149.0947,
      notes: "Sample — replace with yours.",
    },
  ],
  transitGaps: [
    {
      id: "ak-gap-sunday",
      label: "Sunday People Mover gap",
      detail:
        "People Mover buses run light on Sundays — a Sunday ride plan keeps the week smooth.",
    },
    {
      id: "ak-gap-evening",
      label: "Evening service gap",
      detail:
        "Evening routes end early, so evening stops pair well with a carpool or backup ride.",
    },
    {
      id: "ak-gap-winter",
      label: "Winter weather buffer",
      detail:
        "Snow can slow any trip — leaving extra travel time in winter is experienced Anchorage planning.",
    },
    {
      id: "ak-gap-valley-connector",
      label: "Valley connector",
      detail:
        "Wasilla and Eagle River visits usually mean a highway drive — daylight and a full tank make it comfortable.",
    },
  ],
  airports: [
    {
      id: "ak-airport-anc",
      label: "Ted Stevens Anchorage Intl (ANC)",
      category: "airport",
      address: "5000 W International Airport Rd, Anchorage, AK 99502",
      lat: 61.1743,
      lng: -149.9962,
    },
    {
      id: "ak-airport-merrill",
      label: "Merrill Field (MRI)",
      category: "airport",
      address: "800 Merrill Field Dr, Anchorage, AK 99501",
      lat: 61.2144,
      lng: -149.8444,
    },
  ],
};

/** The preset selected when the player has not picked one yet. */
export const DEFAULT_GEO_PRESET_ID = "wa";

/** All schedule-juggle geo presets, default first. */
export const geoPresets: readonly GeoPreset[] = [
  waGeoPreset,
  nhGeoPreset,
  akGeoPreset,
];

/** Look up a preset by id; falls back to the default so play never blocks. */
export function getGeoPreset(id: string): GeoPreset {
  const found = geoPresets.find((preset) => preset.id === id);
  return found ?? waGeoPreset;
}
