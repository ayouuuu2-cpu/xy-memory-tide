export type GlobeMarkerKind = "trace" | "wish";

export type GlobeMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: GlobeMarkerKind;
  /** 标记日期为 9·14 / 11·12：星点亮度与外发光加倍 */
  resonance: boolean;
};
