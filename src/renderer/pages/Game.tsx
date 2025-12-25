import { Button } from '@renderer/components/button'
import { cn } from '@renderer/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { NavLink, useParams } from 'react-router'

function Game() {
  const { id } = useParams<{ id: string }>()

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

      <h1 className={cn('text-2xl font-bold')}>Game Details Page {id}</h1>
    </div>
  )
}

export default Game
