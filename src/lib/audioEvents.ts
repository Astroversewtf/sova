export type SfxEventKey =
  | "death"
  | "boss-spot"
  | "boss-intro-start"
  | "boss-intro-stop"
  | "user-attack"
  | "breakbles"
  | "user-step"
  | "user-get-hit"
  | "stairs-enter"
  | "collect-coin"
  | "collect-energy"
  | "collect-golden-ticket"
  | "collect-orb"
  | "click-button";

export function emitSfxEvent(key: SfxEventKey) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SfxEventKey>("sova:sfx", { detail: key }));
}
