import type { PendingTask, QueueTask } from '../types'

export class DownloadQueue {
  private readonly queue: PendingTask[] = []
  private running = false

  enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.maybeRunNext()
    })
  }

  private async maybeRunNext(): Promise<void> {
    if (this.running) return
    const next = this.queue.shift()
    if (!next) return

    this.running = true
    try {
      const result = await next.task()
      next.resolve(result)
    } catch (err) {
      next.reject(err)
    } finally {
      this.running = false
      // Run subsequent tasks, if any
      this.maybeRunNext()
    }
  }

  get size(): number {
    return this.queue.length + (this.running ? 1 : 0)
  }
}
