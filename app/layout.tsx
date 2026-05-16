import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal de Documentación · Zen Finance',
  description: 'Sube tus documentos de forma segura desde el móvil en menos de 5 minutos.',
  openGraph: {
    title: 'Portal de Documentación · Zen Finance',
    description: 'Sube tus documentos de forma segura desde el móvil en menos de 5 minutos.',
    images: [{ url: '/mascota zen.jpg', width: 400, height: 400 }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portal de Documentación · Zen Finance',
    description: 'Sube tus documentos de forma segura desde el móvil en menos de 5 minutos.',
    images: ['/mascota zen.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-prompt">{children}</body>
    </html>
  )
}
