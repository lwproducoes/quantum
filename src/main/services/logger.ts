import log from 'electron-log'

log.errorHandler.startCatching({
  showDialog: false
})

log.initialize()

export const logger = log.scope('main')
