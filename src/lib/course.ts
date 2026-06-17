import { getCollection, type CollectionEntry } from 'astro:content';

export type Lesson = CollectionEntry<'kurs'>;

export interface ModuleNode {
  modul: number;
  modulTitel: string;
  lessons: Lesson[];
}

export interface DelNode {
  del: string;
  modules: ModuleNode[];
}

/** Alla lektioner, sorterade på `ordning`. Den globala läsordningen. */
export async function getLessonsInOrder(): Promise<Lesson[]> {
  const lessons = await getCollection('kurs');
  return lessons.sort((a, b) => a.data.ordning - b.data.ordning);
}

/**
 * Bygger hierarkin Del → Modul → Lektion ur kollektionen.
 * Delar ordnas efter sin första lektions `ordning`; moduler efter `modul`.
 */
export async function getCourseTree(): Promise<DelNode[]> {
  const lessons = await getLessonsInOrder();

  const delMap = new Map<string, Map<number, ModuleNode>>();
  const delOrder: string[] = [];

  for (const lesson of lessons) {
    const { del, modul, modulTitel } = lesson.data;

    if (!delMap.has(del)) {
      delMap.set(del, new Map());
      delOrder.push(del);
    }
    const modules = delMap.get(del)!;

    if (!modules.has(modul)) {
      modules.set(modul, { modul, modulTitel, lessons: [] });
    }
    modules.get(modul)!.lessons.push(lesson);
  }

  return delOrder.map((del) => ({
    del,
    modules: [...delMap.get(del)!.values()].sort((a, b) => a.modul - b.modul),
  }));
}

/** Föregående/nästa lektion i den globala ordningen. */
export async function getAdjacent(
  id: string
): Promise<{ prev: Lesson | null; next: Lesson | null }> {
  const lessons = await getLessonsInOrder();
  const i = lessons.findIndex((l) => l.id === id);
  return {
    prev: i > 0 ? lessons[i - 1] : null,
    next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : null,
  };
}

/** Lästid i minuter (≈ 200 ord/min), minst 1. */
export function readingTime(body: string | undefined): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Webbsökväg för en lektion. */
export function lessonHref(lesson: Lesson): string {
  return `/kurs/${lesson.id}/`;
}
