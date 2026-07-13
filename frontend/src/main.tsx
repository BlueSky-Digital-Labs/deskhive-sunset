import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store } from '@/app/store'
import { setAccessToken } from '@/lib/auth/tokenStore'
import { ToastContainer } from '@/components/ToastContainer'
import { AppThemeProvider } from '@/theme'
import App from './App'
import './index.css'
import '@/styles/toast.css'
import '@/styles/skeleton.css'
import '@/styles/empty.css'

setAccessToken(store.getState().auth.accessToken)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <ToastContainer />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </AppThemeProvider>
  </StrictMode>,
)
