import { Outlet } from 'react-router-dom'
import ClientNavbar from './ClientNavbar'
import ClientFooter from './ClientFooter'

export default function ClientLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ClientNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ClientFooter />
    </div>
  )
}
