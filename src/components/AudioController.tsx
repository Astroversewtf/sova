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

const SFX_SRC: Record<Exclude<SfxEventKey, "boss-intro-start" | "boss-intro-stop" | "skills-shuffle-start" | "skills-shuffle-stop" | "heartbeat-start" | "heartbeat-stop">, string> = {
  death: "/sounds/sfx/death/death.mp3",
  "boss-spot": "/sounds/sfx/boss/boss-spot.mp3",
  "skills-shuffle-end": "/sounds/sfx/skills/after-shaffle-skills.wav",
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
  "skills-shuffle-start": 0.72,
};

const SFX_MAX_MS: Partial<Record<SfxEventKey, number>> = {
  "user-attack": 1000,
  "user-step": 220,
  "collect-energy": 260,
  "skills-shuffle-end": 1000,
};
const SFX_START_AT_MS: Partial<Record<SfxEventKey, number>> = {
  death: 520,
};

const BOSS_INTRO_SRC = "/sounds/sfx/boss/boss-intro.wav";
const SKILLS_SHUFFLE_SRC = "/sounds/sfx/skills/shaffle-skills.wav";
const HEARTBEAT_SRC = "/sounds/sfx/heartbeat/heartbeat.wav";
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
  const skillsShuffleRef = useRef<HTMLAudioElement | null>(null);
  const bossFadeRafRef = useRef<number | null>(null);
  const heartbeatRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatIntensityRef = useRef(0);
  const activeMonoRef = useRef<
    Partial<Record<Exclude<SfxEventKey, "boss-intro-start" | "boss-intro-stop" | "skills-shuffle-start" | "skills-shuffle-stop" | "heartbeat-start" | "heartbeat-stop">, { audio: HTMLAudioElement; timer: number | null }>>
  >({});
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

  function playOneShot(key: Exclude<SfxEventKey, "boss-intro-start" | "boss-intro-stop" | "skills-shuffle-start" | "skills-shuffle-stop" | "heartbeat-start" | "heartbeat-stop">) {
    if (!unlockedRef.current) return;
    const src = SFX_SRC[key];
    if (!src) return;

    const mono = key === "user-step";
    if (mono) {
      const active = activeMonoRef.current[key];
      if (active) {
        if (active.timer !== null) clearTimeout(active.timer);
        active.audio.pause();
        active.audio.currentTime = 0;
        delete activeMonoRef.current[key];
      }
    }

    const audio = new Audio(src);
    audio.preload = "auto";
    setAudioVolume(audio, sfxVolumeFor(key));
    const startAtMs = SFX_START_AT_MS[key];
    if (startAtMs && startAtMs > 0) {
      const startAtSec = startAtMs / 1000;
      const applyStartOffset = () => {
        try {
          const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : startAtSec;
          audio.currentTime = Math.min(startAtSec, Math.max(0, duration - 0.01));
        } catch {
          // ignore; some browsers may reject currentTime before metadata is ready
        }
      };

      if (audio.readyState >= 1) {
        applyStartOffset();
      } else {
        audio.addEventListener("loadedmetadata", applyStartOffset, { once: true });
      }
    }

    const capMs = SFX_MAX_MS[key];
    let stopTimer: number | null = null;
    if (capMs && capMs > 0) {
      stopTimer = window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        if (mono) delete activeMonoRef.current[key];
      }, capMs);
      audio.addEventListener("ended", () => {
        if (stopTimer !== null) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        if (mono) delete activeMonoRef.current[key];
      }, { once: true });
    }
    if (mono) {
      activeMonoRef.current[key] = { audio, timer: stopTimer };
    }
    audio.play().catch(() => undefined);
  }

  function startHeartbeat() {
    if (!unlockedRef.current) return;
    if (heartbeatRef.current) return; // already playing

    const audio = new Audio(HEARTBEAT_SRC);
    audio.preload = "auto";
    audio.loop = true;
    const vol = sfxBaseVolume() * heartbeatIntensityRef.current;
    setAudioVolume(audio, vol);
    heartbeatRef.current = audio;
    audio.play().catch(() => undefined);
  }

  function stopHeartbeat() {
    const audio = heartbeatRef.current;
    if (!audio) return;
    stopAudio(audio);
    heartbeatRef.current = null;
  }

  function updateHeartbeatVolume(intensity: number) {
    heartbeatIntensityRef.current = clamp01(intensity);
    // Recovery path: if heartbeat-start was emitted before audio unlock,
    // start as soon as we receive intensity updates while unlocked.
    if (heartbeatIntensityRef.current > 0 && unlockedRef.current && !heartbeatRef.current) {
      startHeartbeat();
    }
    const audio = heartbeatRef.current;
    if (!audio) return;
    setAudioVolume(audio, sfxBaseVolume() * heartbeatIntensityRef.current);
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

  function startSkillsShuffle() {
    if (!unlockedRef.current) return;
    const volume = clamp01(sfxVolumeFor("skills-shuffle-start"));

    if (skillsShuffleRef.current) {
      setAudioVolume(skillsShuffleRef.current, volume);
      if (skillsShuffleRef.current.paused) {
        skillsShuffleRef.current.play().catch(() => undefined);
      }
      return;
    }

    const loop = new Audio(SKILLS_SHUFFLE_SRC);
    loop.preload = "auto";
    loop.loop = true;
    setAudioVolume(loop, volume);
    skillsShuffleRef.current = loop;
    loop.play().catch(() => undefined);
  }

  function stopSkillsShuffle() {
    const audio = skillsShuffleRef.current;
    if (!audio) return;
    stopAudio(audio);
    skillsShuffleRef.current = null;
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

    // If user unmutes while low energy state is active, ensure heartbeat resumes.
    if (!muteRef.current && heartbeatIntensityRef.current > 0 && unlockedRef.current && !heartbeatRef.current) {
      startHeartbeat();
    }
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
    if (boss) {
      setAudioVolume(boss, sfxVolumeFor("boss-intro-start"));
      if (muteRef.current && !boss.paused) {
        setAudioVolume(boss, 0);
      }
    }
    // Sync heartbeat volume with mute/sfx settings
    const hb = heartbeatRef.current;
    if (hb) {
      setAudioVolume(hb, sfxBaseVolume() * heartbeatIntensityRef.current);
    }
    const shuffle = skillsShuffleRef.current;
    if (shuffle) {
      setAudioVolume(shuffle, sfxVolumeFor("skills-shuffle-start"));
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
      if (key === "skills-shuffle-start") {
        startSkillsShuffle();
        return;
      }
      if (key === "skills-shuffle-stop") {
        stopSkillsShuffle();
        return;
      }
      if (key === "heartbeat-start") {
        startHeartbeat();
        return;
      }
      if (key === "heartbeat-stop") {
        stopHeartbeat();
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

    const onHeartbeatVolume = (event: Event) => {
      const intensity = (event as CustomEvent<number>).detail;
      updateHeartbeatVolume(intensity);
    };

    window.addEventListener("sova:sfx", onSfx as EventListener);
    window.addEventListener("sova:heartbeat-volume", onHeartbeatVolume as EventListener);
    window.addEventListener("pointerdown", onUiClick, true);

    return () => {
      window.removeEventListener("sova:sfx", onSfx as EventListener);
      window.removeEventListener("sova:heartbeat-volume", onHeartbeatVolume as EventListener);
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
      stopAudio(skillsShuffleRef.current);
      stopAudio(heartbeatRef.current);
      heartbeatRef.current = null;
      skillsShuffleRef.current = null;
      Object.values(activeMonoRef.current).forEach((entry) => {
        if (!entry) return;
        if (entry.timer !== null) clearTimeout(entry.timer);
        stopAudio(entry.audio);
      });
      activeMonoRef.current = {};
      musicSecondaryRef.current = null;
      musicPrimaryRef.current = null;
      bossIntroRef.current = null;
      musicTrackRef.current = null;
    };
  }, []);

  return null;
}
