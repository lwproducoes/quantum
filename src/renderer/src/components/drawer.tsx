import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  side?: 'left' | 'right'
}

export function Drawer({
  open,
  onOpenChange,
  children,
  title,
  side = 'right'
}: Readonly<DrawerProps>): React.JSX.Element {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  const sideTranslate = side === 'right' ? 'translate-x-full' : '-translate-x-full'
  const drawerTransform = open ? 'translate-x-0' : sideTranslate

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity z-40',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 w-2/5 bg-background shadow-lg transition-transform duration-300 z-50 flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          drawerTransform
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </>
  )
}
