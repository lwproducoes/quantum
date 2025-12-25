import { AlertCircle, Home, RotateCcw } from 'lucide-react'
import { useNavigate, useRouteError } from 'react-router'
import { Button } from './button'
import { Card, CardContent, CardTitle } from './card'

export function ErrorBoundary(): React.JSX.Element {
  const error = useRouteError() as Error
  const navigate = useNavigate()

  console.error('Route error:', error)

  return (
    <div className="h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle size={32} />
            <CardTitle className="text-xl">Algo deu errado</CardTitle>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Sorry, an unexpected error occurred.</p>
            {error?.message && (
              <div className="p-3 bg-muted rounded-md">
                <code className="text-xs break-all">{error.message}</code>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="flex-1 gap-2">
              <RotateCcw size={16} />
              Recarregar
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="flex-1 gap-2">
              <Home size={16} />
              Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
