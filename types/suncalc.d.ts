declare module "suncalc" {
  export function getMoonIllumination(date?: Date): {
    fraction: number;
    phase: number;
    angle: number;
  };
}
