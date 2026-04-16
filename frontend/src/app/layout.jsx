import '../index.css'
import 'react-toastify/dist/ReactToastify.css'
import Providers from './providers'

export const metadata = {
  title: 'Testify',
  description: 'Role-based online examination platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
