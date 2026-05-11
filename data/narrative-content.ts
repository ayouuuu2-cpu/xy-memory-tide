/**
 * Narrative layer copy — UI labels stay English; emotional text in natural Chinese.
 */

export type TimelineEntry = {
  id: string;
  /** e.g. "2023 · 夏天" */
  era: string;
  /** Short anchor line */
  title: string;
  /** Memory detail */
  body: string;
  /** Quiet emotional note */
  emotion: string;
  /** Optional image URL (user / future) */
  imageUrl?: string | null;
};

export const DEFAULT_TIMELINE: TimelineEntry[] = [
  {
    id: "t1",
    era: "2023 · 夏天",
    title: "第一次一起旅行",
    body: "行李很轻，路却走得很慢。我们在月台等了很久，其实谁也不急。",
    emotion: "后来想起来，那天其实很安静，但我记得很清楚。",
  },
  {
    id: "t2",
    era: "傍晚",
    title: "那天下雨的傍晚",
    body: "雨线把街灯晕开，伞沿的水滴一颗颗掉下去，像有人在数时间。",
    emotion: "风很大，我们没有说话。",
  },
  {
    id: "t3",
    era: "深夜",
    title: "深夜便利店",
    body: "玻璃门一开一合，关东煮的热气扑到脸上。你挑了一瓶温牛奶。",
    emotion: "我现在想起来还是会笑。",
  },
  {
    id: "t4",
    era: "路上",
    title: "一段没有名字的路",
    body: "车窗外山影一层层退后，像有人在慢慢翻页。",
    emotion: "那一刻我没有说，但我记得。",
  },
];

export type BottleMessage = { id: string; text: string };

export const BOTTLE_MESSAGES_ENTER: BottleMessage[] = [
  { id: "b1", text: "其实那天我特别开心。" },
  { id: "b2", text: "我现在想起来还是会笑。" },
  { id: "b3", text: "那一刻我没有说，但我记得。" },
  { id: "b4", text: "后来我才意识到那一刻很重要。" },
];

export const BOTTLE_MESSAGES_DREAM: BottleMessage[] = [
  { id: "d1", text: "有些情绪不需要名字。" },
  { id: "d2", text: "Some feelings leave a trace even after they've gone." },
  { id: "d3", text: "我把它放在这里，慢慢想。" },
];

/** Very small hidden fragments — intimate, not loud. */
export const EASTER_WHISPERS_ENTER: string[] = [
  "那张车票我一直夹在书里，没舍得丢。",
  "你睡着的时候，窗外云很薄，像一层纱。",
];

export const EASTER_WHISPERS_DREAM: string[] = [
  "有时候回忆不是画面，是一种温度。",
  "我把这句话留在这里，像放在抽屉最底层。",
];
