import { Button } from '@renderer/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/card'
import { Input } from '@renderer/components/input'
import { getDownloadFolder, selectDownloadFolder, setDownloadFolder } from '@renderer/lib/api'
import { cn } from '@renderer/lib/utils'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { toast } from 'react-toastify'

function Settings(): React.JSX.Element {
  const [downloadFolder, setDownloadFolderState] = useState<string>('')
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  useEffect(() => {
    getDownloadFolder().then((saved) => {
      if (saved) setDownloadFolderState(saved)
    })
  }, [])

  async function handleBrowse() {
    const path = await selectDownloadFolder()
    if (path) {
      setDownloadFolderState(path)
    }
  }

  async function handleSave() {
    if (!downloadFolder) return
    const success = await setDownloadFolder(downloadFolder)
    if (success) {
      toast.success('Download folder saved successfully!', { position: 'top-right' })
    } else {
      toast.error('Failed to save download folder.', { position: 'top-right' })
    }
  }

  async function handleCheckForUpdates() {
    setCheckingUpdates(true)
    toast.info('Checking for updates...', { autoClose: 2000 })
    try {
      await window.api.checkForUpdates()
    } catch (err) {
      toast.error('Error checking for updates')
    } finally {
      setTimeout(() => setCheckingUpdates(false), 2000)
    }
  }

  return (
    <div className={cn('p-4')}>
      <div className={cn('flex items-center gap-4')}>
        <NavLink to="/">
          <Button variant="outline" size="icon" aria-label="Go back">
            <ArrowLeft />
          </Button>
        </NavLink>
        <h1 className={cn('mt-4 text-2xl font-bold m-0')}>Settings</h1>
      </div>

      <div className={cn('mt-6')}>
        <Card className={cn('py-4')}>
          <CardHeader className={cn('border-b')}>
            <CardTitle>Download Folder</CardTitle>
            <CardDescription>Choose where to save your game downloads.</CardDescription>
          </CardHeader>
          <CardContent className={cn('pt-6')}>
            <div className={cn('flex items-center gap-3')}>
              <Input
                aria-label="Selected download folder"
                placeholder="No folder selected"
                value={downloadFolder}
                onChange={(e) => setDownloadFolderState(e.target.value)}
              />
              <Button variant="outline" onClick={handleBrowse} aria-label="Browse folders">
                Browse
              </Button>
              <Button onClick={handleSave} aria-label="Save settings">
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('py-4 mt-6')}>
          <CardHeader className={cn('border-b')}>
            <CardTitle>Updates</CardTitle>
            <CardDescription>Check for application updates manually.</CardDescription>
          </CardHeader>
          <CardContent className={cn('pt-6')}>
            <Button
              onClick={handleCheckForUpdates}
              disabled={checkingUpdates}
              className={cn('flex items-center gap-2')}
            >
              <RefreshCw className={cn(checkingUpdates && 'animate-spin')} size={16} />
              {checkingUpdates ? 'Checking...' : 'Check for Updates'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings
