export interface BeautyFilterSettings {
  smooth: number;
  brightness: number;
  glow: number;
}

export const DEFAULT_SETTINGS: BeautyFilterSettings = {
  smooth: 0.5,
  brightness: 0.1,
  glow: 0.15,
};

export const STORAGE_KEY = 'beauty-filter-settings';
