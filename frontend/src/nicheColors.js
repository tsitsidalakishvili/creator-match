// Mantine color per niche — used for badges and avatars so topics are
// recognizable at a glance across the app.
export const NICHE_COLORS = {
  fashion: 'pink',
  beauty: 'grape',
  lifestyle: 'violet',
  entertainment: 'indigo',
  fitness: 'teal',
  food: 'orange',
  travel: 'cyan',
  comedy: 'yellow',
  music: 'blue',
  gaming: 'lime',
  tech: 'blue',
  business: 'indigo',
  education: 'teal',
  news: 'red',
  politics: 'red',
  social: 'green',
  health: 'green',
}

export function nicheColor(niche) {
  return NICHE_COLORS[niche] || 'gray'
}
