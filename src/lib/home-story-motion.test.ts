import { describe, expect, it } from "vitest";

import { STORY_FACTS } from "@/components/home/HomeStory";

import { MOTION_INIT_SCRIPT, allowedFor } from "./home-story-motion-gate";
import { storyFrame } from "./home-story-motion";

describe("home story: when it moves", () => {
  it("static for reduced motion, data saver, ≤ 4 cores or ≤ 2 GB", () => {
    expect(allowedFor({ reducedMotion: true, cores: 8 })).toBe(false);
    expect(allowedFor({ reducedMotion: false, saveData: true, cores: 8 })).toBe(false);
    expect(allowedFor({ reducedMotion: false, cores: 4 })).toBe(false);
    expect(allowedFor({ reducedMotion: false, cores: 8, memoryGb: 2 })).toBe(false);
    expect(allowedFor({ reducedMotion: false, cores: 8, memoryGb: 4 })).toBe(true);
    expect(allowedFor({ reducedMotion: false })).toBe(true);
  });

  it("the <head> script checks the same four conditions", () => {
    for (const part of [
      "prefers-reduced-motion: reduce",
      "saveData",
      "hardwareConcurrency<=4",
      "deviceMemory<=2",
      'dataset.motion="off"',
    ])
      expect(MOTION_INIT_SCRIPT).toContain(part);
  });
});

describe("home story: choreography", () => {
  it("starts on the closed coast with the title, ends on Gorongosa", () => {
    const start = storyFrame(0);
    expect(start.intro.o).toBe(1);
    expect(start.halves.x).toBe(0);
    expect(start.ilha.o).toBe(0);
    const end = storyFrame(1);
    expect(end.intro.o).toBe(0);
    expect(end.gorongosa.o).toBe(1);
    expect(end.ilha.o).toBe(0);
  });

  it("shows the Ilha panel in the middle of its scene and the Gorongosa one later", () => {
    expect(storyFrame(0.42).panelIlha.o).toBe(1);
    expect(storyFrame(0.42).panelGor.o).toBe(0);
    expect(storyFrame(0.82).panelGor.o).toBe(1);
    expect(storyFrame(0.82).panelIlha.o).toBe(0);
  });

  it("only moves along transform/opacity values in range", () => {
    for (let s = 0; s <= 1; s += 0.05) {
      const f = storyFrame(s);
      for (const o of [f.intro.o, f.ilha.o, f.gorongosa.o, f.dim.o, f.panelIlha.o, f.panelGor.o]) {
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(1);
      }
    }
  });

  it("every fact has a source link", () => {
    for (const fact of [...STORY_FACTS.ilha, ...STORY_FACTS.gorongosa])
      expect(fact.source).toMatch(/^https:\/\//);
  });
});
