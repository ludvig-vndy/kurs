import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// En quizfråga. `ratt` som number => single-choice (radio).
// `ratt` som number[] => multi-select (checkbox, "Välj alla som stämmer").
const quizFraga = z.object({
  fraga: z.string(),
  svar: z.array(z.string()).min(2),
  ratt: z.union([z.number().int(), z.array(z.number().int()).min(1)]),
  forklaring: z.string().optional(),
});

const kurs = defineCollection({
  // Hämtar alla markdown/mdx-filer under content/kurs/, oavsett mappdjup.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/kurs' }),
  schema: z.object({
    del: z.string(),
    modul: z.number().int(),
    modulTitel: z.string(),
    lektion: z.string(),
    titel: z.string(),
    niva: z.enum(['Nybörjare', 'Mellan', 'Avancerad']),
    ordning: z.number().int(),
    fardighet: z.string(),
    quiz: z.array(quizFraga).optional(),
  }),
});

export const collections = { kurs };
