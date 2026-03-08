"use client";

import { useEffect, useRef, useState } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SfxEventKey } from "@/lib/audioEvents";

function trackForView(view: string): string | null {
  if (view === "lobby") return "/sounds/tracks/lobby/lobby.mp3";
  if (view === "game") return "/sounds/tracks/game/game-track.mp3";
  return null;
}

const SFX_SRC: Record<Exclude<SfxEventKey, "boss-intro-start" | "boss-intro-stop">, string> = {
  death: "/sounds/sfx/death/death.mp3",
  "boss-spot": "/sounds/sfx/boss/boss-spot.mp3",
  "user-attack": "/sounds/sfx/player/user-attack.wav",
  breakbles: "/sounds/sfx/breakbles/breakbles.wav",
  "user-step": "/sounds/sfx/player/user-step.wav",
  "user-get-hit": "/sounds/sfx/player/user-get-hit.wav",
  "stairs-enter": "/sounds/sfx/stairs/stairs-enter.wav",
  "collect-coin": "/sounds/sfx/collect/collect-coin.wav",
  "collect-energy": "/sounds/sfx/collect/collect-energy.wav",
  "collect-golden-ticket": "/sounds/sfx/collect/collect-golden-ticket.wav",
  "collect-orb": "/sounds/sfx/collect/collect-orb.wav",
  "click-button": "/sounds/sfx/ui/click-button.wav",
};

const SFX_GAIN: Partial<Record<SfxEventKey, number>> = {
  "user-step": 0.45,
  "click-button": 0.55,
  "boss-intro-start": 0.75,
};

const SFX_MAX_MS: Partial<Record<SfxEventKey, number>> = {
  "user-attack": 1000,
};

const BOSS_INTRO_SRC = "/sounds/sfx/boss/boss-intro.wav";
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function AudioController() {
  const view = useWalletStore((s) => s.view);
  const muteAll = useSettingsStore((s) => s.muteAll);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);

  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);

  const musicPrimaryRef = useRef<HTMLAudioElement | null>(null);
  const musicSecondaryRef = useRef<HTMLAudioElement | null>(null);
  const musicTrackRef = useRef<string | null>(null);
  const musicFadeRafRef = useRef<number | null>(null);

  const bossIntroRef = useRef<HTMLAudioElement | null>(null);
  const bossFadeRafRef = useRef<number | null>(null);
  const muteRef = useRef(muteAll);
  const musicVolumeRef = useRef(musicVolume);
  const sfxVolumeRef = useRef(sfxVolume);

  function stopAudio(audio: HTMLAudioElement | null) {
    if (!audio) return;
    audio.pause();
    audio.src = "";
  }

  function setAudioVolume(audio: HTMLAudioElement | null, value: number) {
    if (!audio) return;
    audio.volume = clamp01(value);
  }

  function clearMusicFade() {
    if (musicFadeRafRef.current !== null) {
      cancelAnimationFrame(musicFadeRafRef.current);
      musicFadeRafRef.current = null;
    }
  }

  function clearBossFade() {
    if (bossFadeRafRef.current !== null) {
      cancelAnimationFrame(bossFadeRafRef.current);
      bossFadeRafRef.current = null;
    }
  }

  function tweenMusicVolume(
    durationMs: number,
    onFrame: (t: number) => void,
    onDone?: () => void,
  ) {
    clearMusicFade();
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      onFrame(t);
      if (t < 1) {
        musicFadeRafRef.current = requestAnimationFrame(step);
        return;
      }
      musicFadeRafRef.current = null;
      onDone?.();
    };

    musicFadeRafRef.current = requestAnimationFrame(step);
  }

  function fadeOutBossLoop(durationMs = 260) {
    const audio = bossIntroRef.current;
    if (!audio) return;
    clearBossFade();
    const startVol = audio.volume;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (bossIntroRef.current) {
        setAudioVolume(bossIntroRef.current, startVol * (1 - t));
      }
      if (t < 1) {
        bossFadeRafRef.current = requestAnimationFrame(step);
        return;
      }
      stopAudio(bossIntroRef.current);
      bossIntroRef.current = null;
      bossFadeRafRef.current = null;
    };

    bossFadeRafRef.current = requestAnimationFrame(step);
  }

  function sfxBaseVolume() {
    if (muteRef.current) return 0;
    return clamp01(sfxVolumeRef.current / 100);
  }

  function sfxVolumeFor(key: SfxEventKey) {
    return sfxBaseVolume() * (SFX_GAIN[key] ?? 1);
  }

  function playOneShot(key: Exclude<SfxEventKey, "boss-intro-start" | "boss-intro-stop">) {
    if (!unlockedRef.current) return;
    const src = SFX_SRC[key];
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = "auto";
    setAudioVolume(audio, sfxVolumeFor(key));
    const capMs = SFX_MAX_MS[key];
    let stopTimer: number | null = null;
    if (capMs && capMs > 0) {
      stopTimer = window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, capMs);
      audio.addEventListener("ended", () => {
        if (stopTimer !== null) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
      }, { once: true });
    }
    audio.play().catch(() => undefined);
  }

  function startBossLoop() {
    if (!unlockedRef.current) return;
    const volume = clamp01(sfxVolumeFor("boss-intro-start"));

    if (bossIntroRef.current) {
      clearBossFade();
      setAudioVolume(bossIntroRef.current, volume);
      if (bossIntroRef.current.paused) {
        bossIntroRef.current.play().catch(() => undefined);
      }
      return;
    }

    const loop = new Audio(BOSS_INTRO_SRC);
    loop.preload = "auto";
    loop.loop = true;
    setAudioVolume(loop, volume);
    bossIntroRef.current = loop;
    loop.play().catch(() => undefined);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlock = () => {
      unlockedRef.current = true;
      setUnlocked(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    muteRef.current = muteAll;
    musicVolumeRef.current = Math.max(0, Math.min(100, Number.isFinite(musicVolume) ? musicVolume : 0));
    sfxVolumeRef.current = Math.max(0, Math.min(100, Number.isFinite(sfxVolume) ? sfxVolume : 0));
  }, [muteAll, musicVolume, sfxVolume]);

  useEffect(() => {
    if (!unlocked) return;

    const targetTrack = trackForView(view);
    const targetVolume = muteRef.current ? 0 : clamp01(musicVolumeRef.current / 100);

    const primary = musicPrimaryRef.current;
    const secondary = musicSecondaryRef.current;

    if (!targetTrack) {
      if (secondary) {
        stopAudio(secondary);
        musicSecondaryRef.current = null;
      }
      if (!primary) return;
      const startVol = primary.volume;
      tweenMusicVolume(500, (t) => {
        if (musicPrimaryRef.current) setAudioVolume(musicPrimaryRef.current, startVol * (1 - t));
      }, () => {
        stopAudio(musicPrimaryRef.current);
        musicPrimaryRef.current = null;
        musicTrackRef.current = null;
      });
      return;
    }

    if (primary && musicTrackRef.current === targetTrack) {
      if (secondary) {
        stopAudio(secondary);
        musicSecondaryRef.current = null;
      }
      const startVol = primary.volume;
      tweenMusicVolume(220, (t) => {
        if (musicPrimaryRef.current) {
          setAudioVolume(musicPrimaryRef.current, startVol + (targetVolume - startVol) * t);
        }
      });
      return;
    }

    const nextAudio = new Audio(targetTrack);
    nextAudio.preload = "auto";
    nextAudio.loop = true;
    setAudioVolume(nextAudio, 0);

    if (secondary) stopAudio(secondary);
    musicSecondaryRef.current = nextAudio;
    nextAudio.play().catch(() => undefined);

    if (!primary) {
      musicPrimaryRef.current = nextAudio;
      musicSecondaryRef.current = null;
      musicTrackRef.current = targetTrack;
      tweenMusicVolume(650, (t) => {
        if (musicPrimaryRef.current) {
          setAudioVolume(musicPrimaryRef.current, targetVolume * t);
        }
      }, () => {
        if (musicPrimaryRef.current) setAudioVolume(musicPrimaryRef.current, targetVolume);
      });
      return;
    }

    const startPrimaryVolume = primary.volume;
    tweenMusicVolume(900, (t) => {
      if (musicPrimaryRef.current) {
        setAudioVolume(musicPrimaryRef.current, startPrimaryVolume * (1 - t));
      }
      if (musicSecondaryRef.current) {
        setAudioVolume(musicSecondaryRef.current, targetVolume * t);
      }
    }, () => {
      stopAudio(musicPrimaryRef.current);
      musicPrimaryRef.current = musicSecondaryRef.current;
      musicSecondaryRef.current = null;
      musicTrackRef.current = targetTrack;
      if (musicPrimaryRef.current) setAudioVolume(musicPrimaryRef.current, targetVolume);
    });
  }, [musicVolume, muteAll, unlocked, view]);

  useEffect(() => {
    const boss = bossIntroRef.current;
    if (!boss) return;
    setAudioVolume(boss, sfxVolumeFor("boss-intro-start"));
    if (muteRef.current && !boss.paused) {
      // Keep loop object alive; only mute by volume so it can resume cleanly.
      setAudioVolume(boss, 0);
    }
  }, [muteAll, sfxVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onSfx = (event: Event) => {
      const key = (event as CustomEvent<SfxEventKey>).detail;
      if (!key) return;

      if (key === "boss-intro-start") {
        startBossLoop();
        return;
      }
      if (key === "boss-intro-stop") {
        fadeOutBossLoop();
        return;
      }

      playOneShot(key);
    };

    const onUiClick = (event: PointerEvent) => {
      if (!unlockedRef.current) return;
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest("button, [role='button'], a, input[type='button'], input[type='submit']")) return;
      playOneShot("click-button");
    };

    window.addEventListener("sova:sfx", onSfx as EventListener);
    window.addEventListener("pointerdown", onUiClick, true);

    return () => {
      window.removeEventListener("sova:sfx", onSfx as EventListener);
      window.removeEventListener("pointerdown", onUiClick, true);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearMusicFade();
      clearBossFade();
      stopAudio(musicSecondaryRef.current);
      stopAudio(musicPrimaryRef.current);
      stopAudio(bossIntroRef.current);
      musicSecondaryRef.current = null;
      musicPrimaryRef.current = null;
      bossIntroRef.current = null;
      musicTrackRef.current = null;
    };
  }, []);

  return null;
}
