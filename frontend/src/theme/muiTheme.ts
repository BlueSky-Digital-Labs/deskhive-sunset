import { createTheme } from '@mui/material/styles'

/**
 * MUI theme aligned with DeskHive CSS variables in `styles/theme.css`.
 * Indigo primary + cyan accent for a modern workspace aesthetic.
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4f46e5',
      light: '#6366f1',
      dark: '#4338ca',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: '#e2e8f0',
    success: {
      main: '#10b981',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
    info: {
      main: '#3b82f6',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.04)',
    '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
    '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
    '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.28)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.32)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.34)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.36)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.38)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.42)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.44)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.46)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.48)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.5)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.52)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.54)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.56)',
    '0 25px 50px -12px rgba(15, 23, 42, 0.58)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f1f5f9',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4)',
          },
        },
      },
    },
  },
})
