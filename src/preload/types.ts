// Preload types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const providers = ['romslab', 'nswpedia'] as const
export type Provider = (typeof providers)[number]
