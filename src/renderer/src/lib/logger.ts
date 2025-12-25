// Logger wrapper for renderer that sends logs to main process
const logger = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).api) {
      ;(window as any).api.log(...args)
    } else {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).api) {
      ;(window as any).api.error(...args)
    } else {
      console.error(...args)
    }
  },
  warn: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).api) {
      ;(window as any).api.warn(...args)
    } else {
      console.warn(...args)
    }
  },
  info: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).api) {
      ;(window as any).api.info(...args)
    } else {
      console.info(...args)
    }
  }
}

export default logger
