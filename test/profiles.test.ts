import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  BLANK_PROFILE,
  CENTRAL_YARD_PROFILE,
  loadProfiles,
  saveProfiles,
} from '../src/profiles.ts';
import type { Profile } from '../src/types.ts';

const STORAGE_KEY = 'forma-hk-metrics-profiles';

function installMemoryStorage(): void {
  const mem = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
    setItem: (key: string, value: string) => {
      mem.set(key, String(value));
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => {
      mem.clear();
    },
    key: (index: number) => [...mem.keys()][index] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
}

describe('profile persistence', { concurrency: false }, () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('keeps edits to built-in profiles across a save and load', () => {
    const editedCentral: Profile = {
      ...CENTRAL_YARD_PROFILE,
      maxGfaM2: 99999,
      siteAreaM2: 42000,
      mixTargets: (CENTRAL_YARD_PROFILE.mixTargets ?? []).map((target) => ({
        ...target,
        share: 0.5,
      })),
    };
    const editedBlank: Profile = {
      ...BLANK_PROFILE,
      projectName: 'Scratch',
      siteAreaM2: 80,
      towers: [{ id: 'A', maxBhMpd: 12 }],
    };

    saveProfiles([editedBlank, editedCentral]);
    const loaded = loadProfiles();

    const blank = loaded.find((profile) => profile.id === 'blank');
    const central = loaded.find((profile) => profile.id === 'central-yard');
    assert.equal(loaded.filter((profile) => profile.id === 'central-yard').length, 1);
    assert.equal(blank?.projectName, 'Scratch');
    assert.equal(blank?.siteAreaM2, 80);
    assert.deepEqual(blank?.towers, [{ id: 'A', maxBhMpd: 12 }]);
    assert.equal(central?.maxGfaM2, 99999);
    assert.equal(central?.siteAreaM2, 42000);
    assert.equal(central?.mixTargets?.[0]?.share, 0.5);
    assert.equal(central?.mixTargets?.[1]?.share, 0.5);
  });

  it('keeps an explicit empty mix-target list on a built-in profile', () => {
    saveProfiles([{ ...CENTRAL_YARD_PROFILE, mixTargets: [] }]);
    const central = loadProfiles().find((profile) => profile.id === 'central-yard');
    assert.deepEqual(central?.mixTargets, []);
  });

  it('fills mix targets from current defaults when an older save predates them', () => {
    const legacyCentral: Profile = {
      ...CENTRAL_YARD_PROFILE,
      siteAreaM2: 12345,
      mixTargets: undefined,
      useMix: true,
    };
    saveProfiles([legacyCentral]);

    const loaded = loadProfiles();
    const central = loaded.find((profile) => profile.id === 'central-yard');
    const blank = loaded.find((profile) => profile.id === 'blank');
    assert.equal(central?.siteAreaM2, 12345);
    assert.equal(central?.mixTargets?.[0]?.id, 'office');
    assert.equal(central?.mixTargets?.[0]?.share, 0.43);
    assert.equal(central?.mixTargets?.[1]?.share, 0.57);
    assert.equal(blank?.projectName, 'Blank');
    assert.equal(blank?.siteAreaM2, null);
  });

  it('migrates a legacy office/retail share saved on a built-in profile', () => {
    const legacyCentral: Profile = {
      ...CENTRAL_YARD_PROFILE,
      mixTargets: undefined,
      mixTarget: { officeShare: 0.2, retailShare: 0.8 },
    };
    saveProfiles([legacyCentral]);

    const central = loadProfiles().find((profile) => profile.id === 'central-yard');
    assert.equal(central?.mixTargets?.[0]?.share, 0.2);
    assert.equal(central?.mixTargets?.[1]?.share, 0.8);
  });

  it('keeps custom profiles and migrates their legacy mix targets', () => {
    const custom: Profile = {
      id: 'custom-1',
      projectName: 'Mine',
      siteAreaM2: 10,
      maxGfaM2: 20,
      maxPr: 2,
      maxSc: 0.4,
      gfMpd: 1,
      towers: [],
      mixTarget: { officeShare: 0.25, retailShare: 0.75 },
    };
    saveProfiles([...loadProfiles(), custom]);

    const loaded = loadProfiles();
    const savedCustom = loaded.find((profile) => profile.id === 'custom-1');
    assert.equal(loaded.length, 3);
    assert.equal(savedCustom?.projectName, 'Mine');
    assert.equal(savedCustom?.maxGfaM2, 20);
    assert.equal(savedCustom?.mixTargets?.[0]?.share, 0.25);
    assert.equal(savedCustom?.mixTargets?.[1]?.share, 0.75);
  });

  it('returns shipped defaults when stored data is not a profile list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'central-yard' }));
    const loaded = loadProfiles();
    assert.equal(loaded[0]?.id, 'blank');
    assert.equal(loaded[1]?.id, 'central-yard');
    assert.equal(loaded[1]?.maxGfaM2, 150000);
  });
});
