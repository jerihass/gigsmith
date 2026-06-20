import type { GigRequirementRegistry } from "@gigsmith/data-contracts";

export const cyberpunkGigRequirements: GigRequirementRegistry = {
  version: "gig-requirements.2026-06-20",
  rulesetVersion: "ruleset.v1-printable-2026-06-19",
  entries: [
    { externalCardId: "cb-kerry-eurodyne-the-last-rockerboy", conditions: ["high-8"], note: "Rewards controlling a Gig with value 8+." },
    { externalCardId: "cb-carnage-at-the-colosseum", conditions: ["high-8"], note: "Discounted by each friendly Gig with value 8+." },
    { externalCardId: "cb-el-sombrero-n-la-venganza-lenta", conditions: ["maximum"], note: "Uses the value of a friendly max Gig." },
    { externalCardId: "cb-yorinobu-arasaka-embracing-destruction", conditions: ["street-cred-20"], note: "Avoids its discard rider at 20 Street Cred." },
    { externalCardId: "cb-royce-don-t-call-me-simon", conditions: ["street-cred-lead"], note: "Improves while ahead of the Rival in Street Cred." },
    { externalCardId: "cb-minotaur", conditions: ["street-cred-lead"], note: "Requires more Street Cred than the Rival." },

    { externalCardId: "cb-alt-cunningham-soulkiller-architect", conditions: ["minimum"], note: "Discounted by friendly min Gigs." },
    { externalCardId: "cb-jackie-welles-pour-one-out-for-me", conditions: ["minimum"], note: "Rewards decreasing a friendly Gig to its minimum." },
    { externalCardId: "cb-chrome-reverie", conditions: ["minimum"], note: "Calls a Legend for free while controlling a min Gig." },
    { externalCardId: "cb-evelyn-parker-scheming-siren", conditions: ["street-cred-trail"], note: "Keeps its full draw while not ahead in Street Cred." },
    { externalCardId: "cb-mt0d12-flathead", conditions: ["street-cred-trail"], note: "Cannot be blocked while behind in Street Cred." },

    { externalCardId: "cb-jackie-welles-ride-or-die-choom", conditions: ["parity-mix"], note: "Rewards friendly even and odd Gig values." },
    { externalCardId: "cb-bootleg-black-sapphire-show", conditions: ["parity-mix"], note: "Requires both an even and odd friendly Gig." },
    { externalCardId: "cb-afterparty-at-lizzie-s", conditions: ["distinct-2"], note: "Rewards two or more different friendly values." },
    { externalCardId: "cb-zetatech-faceplate", conditions: ["distinct-3"], note: "Rewards three or more different friendly values." },
    { externalCardId: "cb-gorilla-arms", conditions: ["distinct-2"], note: "Rewards stealing a value not shared by a friendly Gig." },
    { externalCardId: "cb-hanako-arasaka-in-a-gilded-cage", conditions: ["cost-match"], note: "Finds cards whose costs equal friendly Gig values." },
    { externalCardId: "cb-caliber-totentanz-s-top-dog", conditions: ["cost-match"], note: "Rewards discarded costs matching a friendly Gig." },

    { externalCardId: "cb-goro-takemura-vengeful-bodyguard", conditions: ["value-pair"], note: "Rewards a same-value pair of friendly Gigs." },
    { externalCardId: "cb-sandayu-oda-hanako-s-guardian", conditions: ["value-pair"], note: "Scales with same-value pairs of friendly Gigs." },
    { externalCardId: "cb-peace-offering", conditions: ["value-pair"], note: "Creates and rewards a same-value pair." }
  ]
};
