export type JourneyChapter = {
  id: string;
  image: string;
  kicker: string;
  title: string;
  body: string;
  /** Film progress (0–1) at which this chapter's caption appears. */
  at: number;
  align: "left" | "right";
};

export const templeInfo = {
  nameKannada: "ಶ್ರೀ ಲಕ್ಷ್ಮೀ ವೆಂಕಟರಮಣ ದೇವಮಂದಿರ",
  nameEnglish: "Sri Lakshmi Venkataramana Devamandira",
  samajaKannada: "ಗೌಡಸಾರಸ್ವತ ಸಮಾಜ · ಶಿವಮೊಗ್ಗ",
  address: "Panchavathi Colony, Shivamogga, Karnataka 577202",
  mantraKannada: "ಓಂ ನಮೋ ವೆಂಕಟೇಶಾಯ",
  mantraEnglish: "Om Namo Venkatesaya",
} as const;

/**
 * Scrub-optimised encodes of the 27.25s flight, one per orientation — dense
 * keyframes (`-g 8`, no B-frames) so a scroll seek only decodes a frame or two
 * past the nearest keyframe. Built by scripts/build-film.sh.
 */
export const filmVideoSrc = (set: "d" | "m"): string => `/film/${set}-scrub.mp4`;

// `at` values are tuned to the ~27.25s scroll film (3 clips: vd_1 → new_vd_2 →
// new_vd_3): street → arch → torana threshold → pillared hall → golden sanctum →
// deity darshan. vd_1 is the real exterior; a fadeblack (~0.28) steps inside to
// the pillared hall (new_vd_2, ~0.29–0.60); a dissolve (~0.63) flows straight
// into the deity closeup (new_vd_3, ~0.64–1.0). Keep captions off the fadeblack
// (~0.277–0.294) and dissolve (~0.633).
export const journeyChapters: JourneyChapter[] = [
  {
    id: "street",
    image: "/temple/street-exterior.jpg",
    kicker: "Panchavathi Colony",
    title: "The Street",
    body: "On a quiet lane in Shivamogga the vimana rises above the palms — the first glimpse of the Lord's abode, and of the fortune He keeps for the devout.",
    at: 0,
    align: "left",
  },
  {
    id: "entrance",
    image: "/temple/entrance-facade-festival.jpg",
    kicker: "The Entrance",
    title: "Under the Arch",
    body: "Marigold garlands sway beneath the blue arch. Leave the world at the threshold — you enter the house of Lakshmi and Venkatesha.",
    at: 0.17,
    align: "right",
  },
  {
    id: "threshold",
    image: "/temple/inner-doorway-festival.jpg",
    kicker: "The Threshold",
    title: "Crossing In",
    body: "Past the festival torana the street falls silent. Sandal-smoke and lamplight receive you onto sacred ground.",
    at: 0.36,
    align: "left",
  },
  {
    id: "hall",
    image: "/temple/main-hall-sanctum.jpg",
    kicker: "The Pillared Hall",
    title: "Toward the Garbhagudi",
    body: "Down the lamp-lit hall every carved pillar leans toward the sanctum, drawing heart and eye to the Lord of the Seven Hills.",
    at: 0.47,
    align: "right",
  },
  {
    id: "sanctum",
    image: "/temple/sanctum-deity-stone-arch.jpg",
    kicker: "The Sanctum",
    title: "In Lamplight",
    body: "Within the golden arch He stands in lamplight — Srinivasa, upon whose heart Lakshmi dwells, the wellspring of all prosperity.",
    at: 0.57,
    align: "left",
  },
  {
    id: "darshan",
    image: "/temple/deity-closeup-garlands.jpg",
    kicker: "Darshan",
    title: "Garland upon Garland",
    body: "Garland upon garland at His feet. Behold Venkateshwara — refuge of this age, who turns want to abundance and sorrow to light.",
    at: 0.82,
    align: "right",
  },
];

export const finaleImage = "/temple/deity-darshan-highres.jpg";

// Devotional praise shown beneath the deity portrait at the end of the journey.
export const darshanPraise = {
  eyebrow: { kn: "ದರ್ಶನ", en: "Darshan" },
  heading: "Lord of the Seven Hills, Lakshmi upon His heart",
  paragraphs: [
    "Sri Lakshmi Venkataramana is Lord Srinivasa — Venkateshwara, the destroyer of sins — upon whose heart the Goddess Lakshmi eternally abides. In this age of Kali He is the supreme refuge of the devoted, the Lord to whom every prayer may be carried.",
    "Where Lakshmi dwells, fortune follows. To His feet devotees bring their cares and seek prosperity, health and peace; from His darshan they return bearing grace, for the Lord turns want into abundance and sorrow into light.",
    "Enshrined here by the Gowda Saraswatha Samaja of Shivamogga, the Lord receives every seeker. Bow before Him, chant His name, and let His divine blessing fill your days.",
  ],
} as const;
