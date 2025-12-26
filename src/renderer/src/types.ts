// eslint-disable-next-line @typescript-eslint/no-unused-vars
const providers = ['romslab', 'nswpedia'] as const
export type Provider = (typeof providers)[number]

export interface Game {
  id: string
  title: string
  description: string
  imageBoxArt: string
}
