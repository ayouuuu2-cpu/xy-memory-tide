/**
 * Rory 立绘资源（`public/images/rory/`）。
 * 主立绘为 PNG；头像框等仍为 SVG 时可单独保留 `.svg`。
 */
export const RORY_HERO_PRIMARY = "/images/satyr-rory-main.png";
/** 主图 404 或加载失败时的降级顺序 */
export const RORY_HERO_FALLBACKS = ["/images/rory/rory-idle.png", "/images/rory/rory-typing.png"] as const;

export const RORY_SIDEBAR_IDLE = "/images/rory/rory-idle.png";
/** 与 `rory-sleepy.png` 同源；避免依赖大小写混乱的 `rory-sleepy.pn.PNG` URL */
export const RORY_SIDEBAR_SLEEPY = "/images/rory/rory-sleepy.png";
export const RORY_SIDEBAR_CELEBRATE = "/images/rory/rory-celebrate.png";
export const RORY_TYPING = "/images/rory/rory-typing.png";
export const RORY_SEAL = "/images/rory/rory-seal.png";
export const RORY_AVATAR_FRAME = "/images/rory/rory-avatar-frame.png";
/** 点击/强调态（可选，侧栏当前用状态机切换 idle/typing 等） */
export const RORY_CLICK = "/images/rory/rory-click.png";

export function allHeroRorySources(): string[] {
  return [RORY_HERO_PRIMARY, ...RORY_HERO_FALLBACKS];
}
