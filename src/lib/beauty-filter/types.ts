export interface BeautyFilterSettings {
  smooth: number;
  brightness: number;
  glow: number;
}

export const DEFAULT_SETTINGS: BeautyFilterSettings = {
  smooth: 0.65,
  brightness: 0.06,
  glow: 0.2,
};

export const STORAGE_KEY = 'beauty-filter-settings';
