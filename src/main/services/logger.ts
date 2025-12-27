import { app } from 'electron'
import log from 'electron-log'
import path from 'node:path'

const logsPath = path.join(app.getPath('userData'), `logs${app.isPackaged ? '' : '-dev'}`)
console.log(`Logs path: ${logsPath}`)
log.transports.file.resolvePathFn = (
  _: log.PathVariables,
  message?: log.LogMessage | undefined
) => {
  if (message?.scope === 'python-rpc') {
    return path.join(logsPath, 'pythonrpc.txt')
  }

  if (message?.scope === 'network') {
    return path.join(logsPath, 'network.txt')
  }

  if (message?.scope == 'achievements') {
    return path.join(logsPath, 'achievements.txt')
  }

  if (message?.level === 'error') {
    return path.join(logsPath, 'error.txt')
  }

  if (message?.level === 'info') {
    return path.join(logsPath, 'info.txt')
  }

  return path.join(logsPath, 'logs.txt')
}

log.errorHandler.startCatching({
  showDialog: false
})

log.initialize()

export const logger = log.scope('main')
