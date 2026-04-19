import { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert, type AlertColor, Slide, type SlideProps } from '@mui/material'

interface ToastMessage {
    id: number
    message: string
    severity: AlertColor
    duration?: number
}

interface ToastContextValue {
    toast: (message: string, severity?: AlertColor, duration?: number) => void
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="up" />
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const addToast = useCallback((message: string, severity: AlertColor = 'info', duration = 4000) => {
        const id = ++toastId
        setToasts((prev) => [...prev, { id, message, severity, duration }])
    }, [])

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const value: ToastContextValue = {
        toast: addToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.map((t) => (
                <Snackbar
                    key={t.id}
                    open
                    autoHideDuration={t.duration}
                    onClose={() => removeToast(t.id)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    TransitionComponent={SlideTransition}
                    sx={{ mb: (toasts.indexOf(t)) * 7 }}
                >
                    <Alert
                        onClose={() => removeToast(t.id)}
                        severity={t.severity}
                        variant="filled"
                        sx={{
                            borderRadius: 2,
                            fontWeight: 500,
                            minWidth: 300,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }}
                    >
                        {t.message}
                    </Alert>
                </Snackbar>
            ))}
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
