// The five bettor archetypes, with the parameters used in src/simulate.py.
// Changing a number here changes what the simulation means, so they are kept
// together and labelled rather than scattered through the sampling code.

export type Archetype =
  | "sharp"
  | "semi_sharp"
  | "recreational"
  | "recreational_whale"
  | "bonus_abuser";

export interface ArchetypeSpec {
  kind: Archetype;
  label: string;
  /** How far a private probability estimate sits from truth. 0.02 is a strong model. */
  estSd: number;
  /** Systematic pull toward the favourite, the documented recreational bias. */
  favBias: number;
  /** Minimum perceived edge before they place a bet. */
  edgeReq: number;
  /** Share of bets placed at the close rather than the open. */
  lateShare: number;
  stakeMu: number;
  stakeCv: number;
  betsLow: number;
  betsHigh: number;
  /** Share of the account base. */
  share: number;
  description: string;
}

export const ARCHETYPES: ArchetypeSpec[] = [
  {
    kind: "sharp",
    label: "Sharp",
    estSd: 0.025,
    favBias: 0,
    edgeReq: 0.035,
    lateShare: 0.05,
    stakeMu: 180,
    stakeCv: 0.45,
    betsLow: 120,
    betsHigh: 420,
    share: 0.02,
    description:
      "Reads a game about as well as the closing price does, and bets early into prices that have not absorbed it yet.",
  },
  {
    kind: "semi_sharp",
    label: "Semi sharp",
    estSd: 0.055,
    favBias: 0.01,
    edgeReq: 0.025,
    lateShare: 0.25,
    stakeMu: 90,
    stakeCv: 0.55,
    betsLow: 80,
    betsHigh: 300,
    share: 0.06,
    description:
      "Skilled and selective, but not accurate enough to beat the margin. The book still holds on them.",
  },
  {
    kind: "recreational",
    label: "Recreational",
    estSd: 0.11,
    favBias: 0.05,
    edgeReq: 0,
    lateShare: 0.85,
    stakeMu: 22,
    stakeCv: 0.8,
    betsLow: 20,
    betsHigh: 160,
    share: 0.72,
    description: "Bets late, leans on favourites, and requires no edge to place a bet.",
  },
  {
    kind: "recreational_whale",
    label: "Recreational whale",
    estSd: 0.115,
    favBias: 0.06,
    edgeReq: 0,
    lateShare: 0.9,
    stakeMu: 310,
    stakeCv: 0.7,
    betsLow: 90,
    betsHigh: 400,
    share: 0.14,
    description: "The same behaviour as a recreational account at fourteen times the stake.",
  },
  {
    kind: "bonus_abuser",
    label: "Bonus abuser",
    estSd: 0.1,
    favBias: -0.02,
    edgeReq: 0.005,
    lateShare: 0.5,
    stakeMu: 45,
    stakeCv: 0.2,
    betsLow: 60,
    betsHigh: 220,
    share: 0.06,
    description: "Uniform stakes, no read on the game, and a slight lean away from favourites.",
  },
];

/**
 * Adverse is an economic label, not a skill label.
 *
 * The first version of the detection code put semi sharps in here because they
 * are skilled. The cost model then returned a negative cost for failing to
 * restrict them, which was the model saying the label was wrong: the book holds
 * about 4.7% on semi sharps. Cutting them destroys value.
 */
export const ADVERSE: ReadonlySet<Archetype> = new Set<Archetype>(["sharp"]);

export function specOf(kind: Archetype): ArchetypeSpec {
  const spec: ArchetypeSpec | undefined = ARCHETYPES.find(
    (a: ArchetypeSpec): boolean => a.kind === kind,
  );
  if (!spec) {
    throw new Error(`unknown archetype ${kind}`);
  }
  return spec;
}
