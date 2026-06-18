export interface StreakState {
  count: number;
  lastDay?: string;
}
export function daysBetween(a: string, b: string): number;
export function nextStreak(
  prev: { count?: number; lastDay?: string } | undefined,
  today: string
): StreakState;

export interface GateModule {
  key: string;
  lessonIds: string[];
}
export interface GateResult {
  key: string;
  status: 'done' | 'unlocked' | 'locked';
}
export function computeGate(
  modules: GateModule[],
  doneIds: Set<string> | string[],
  devUnlocked?: boolean
): GateResult[];

export interface OrderedLesson {
  id: string;
  moduleKey: string;
}
export interface ResumePos {
  lessonId: string;
  step: number;
}
export function resumeTarget(
  meta: { lastLessonId?: string; lastStep?: number } | undefined,
  ordered: OrderedLesson[],
  doneIds: Set<string> | string[],
  gate: GateResult[]
): ResumePos | null;
