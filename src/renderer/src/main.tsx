import 'react-toastify/dist/ReactToastify.css'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import { ToastContainer } from 'react-toastify'
import Game from '../pages/Game'
import Home from '../pages/Home'
import Settings from '../pages/Settings'
import { ErrorBoundary } from './components/error-boundary'
import { ThemeProvider } from './components/theme-provider'
import { UpdaterNotification } from './components/updater-notification'

const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/settings',
    element: <Settings />,
    errorElement: <ErrorBoundary />
  },
  {
    path: '/game/:id',
    element: <Game />,
    errorElement: <ErrorBoundary />
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <UpdaterNotification />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
)
