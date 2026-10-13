// The categories of the original Max Crime WordPress site, with their names
// and URL slugs (maxcrime.com/category/<slug>/), exactly as they were.
// Coronavirus News, Weather and Westland Local were sub-categories of News,
// so their URLs sit under /category/news/ (Wayback Machine, 2021-2022). New stories
// use one of these; a category gets a page once it has a story, as on
// WordPress.
export const CATEGORIES = [
  { name: "Animals", slug: "animals" },
  { name: "Celebrity", slug: "celebrity" },
  { name: "CNN Shooting", slug: "cnn-shooting" },
  { name: "Coronavirus News", slug: "news/coronavirus-news" },
  { name: "Crime", slug: "crime" },
  { name: "Crime & Tragedy", slug: "crime-tragedy" },
  { name: "Crime News", slug: "crime-news" },
  { name: "Crime Online Dead", slug: "crime-online-dead" },
  { name: "Crime Online Shooting", slug: "crime-online-shooting" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Family", slug: "family" },
  { name: "Health", slug: "health" },
  { name: "Life", slug: "life" },
  { name: "Lifestyle", slug: "lifestyle" },
  { name: "Local News", slug: "local-news" },
  { name: "Majestic", slug: "majestic" },
  { name: "News", slug: "news" },
  { name: "newsweek crime 1", slug: "newsweek-crime-1" },
  { name: "newsweek crime 2", slug: "newsweek-crime-2" },
  { name: "NY Post Killed", slug: "ny-post-killed" },
  { name: "Pets", slug: "pets" },
  { name: "Politics", slug: "politics" },
  { name: "Recipes", slug: "recipes" },
  { name: "Sport", slug: "sport" },
  { name: "Sports", slug: "sports" },
  { name: "Strange", slug: "strange" },
  { name: "Top", slug: "top" },
  { name: "Top News", slug: "top-news" },
  { name: "Tragedy", slug: "tragedy" },
  { name: "True Crime", slug: "true-crime" },
  { name: "Viral News", slug: "viral-news" },
  { name: "Weather", slug: "news/weather" },
  { name: "Westland Local", slug: "news/westland-local" },
  { name: "Uncategorized", slug: "uncategorized" },
] as const;

export type Category = (typeof CATEGORIES)[number]['name'];
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name) as [Category, ...Category[]];
const SLUGS = new Map<string, string>(CATEGORIES.map((c) => [c.name, c.slug]));
export const categorySlug = (name: string) => SLUGS.get(name) ?? 'uncategorized';
