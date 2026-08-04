export const AUTO_EVENT_KEYS = ["eagle", "birdie", "espanol", "triputt"] as const;

type AutoEventFlags = {
  eagle: boolean;
  birdie: boolean;
  espanol: boolean;
  triputt: boolean;
};

export function deriveAutomaticHoleEvents(par: number, strokes: number, putts: number): AutoEventFlags {
  const safePar = Number.isFinite(par) && par > 0 ? par : 4;
  const safeStrokes = Number.isFinite(strokes) && strokes > 0 ? strokes : 0;
  const safePutts = Number.isFinite(putts) && putts >= 0 ? putts : 0;

  return {
    eagle: safeStrokes === safePar - 2,
    birdie: safeStrokes === safePar - 1,
    espanol: safeStrokes >= safePar * 2,
    triputt: safePutts >= 3,
  };
}

export function applyAutomaticHoleEvents<
  T extends {
    eagle: boolean;
    birdie: boolean;
    espanol: boolean;
    triputt: boolean;
  },
>(par: number, strokes: number, putts: number, events: T): T {
  return {
    ...events,
    ...deriveAutomaticHoleEvents(par, strokes, putts),
  };
}
