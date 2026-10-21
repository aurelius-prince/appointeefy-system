import { MessageSquare } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'

export default function SuperSupport() {
  return (
    <div>
      <PageHeader title="Support" subtitle="Manage support requests from providers" />
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={24} className="text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Support Coming Soon</p>
        <p className="text-sm text-gray-400">Support ticket system will be available in a future update.</p>
      </div>
    </div>
  )
}
