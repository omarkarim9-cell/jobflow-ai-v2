
import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle, LifeBuoy } from 'lucide-react';

export const Support: React.FC = () => {
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketData, setTicketData] = useState({ subject: '', description: '', type: 'Connection Issue (Gmail/Outlook)' });
  const [isSending, setIsSending] = useState(false);

  const handleSupportSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSending(true);
      // Simulate backend API call
      setTimeout(() => {
          setTicketSent(true);
          setIsSending(false);
          setTicketData({ subject: '', description: '', type: 'Connection Issue (Gmail/Outlook)' });
      }, 1500);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
        {/* Sidebar Info */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center mb-6">
                <LifeBuoy className="w-5 h-5 mr-2 text-indigo-600" /> Support
            </h2>
            <div className="text-sm text-slate-600 space-y-4">
                <p>
                    Need help? Our support team is here to assist you with any issues you might encounter.
                </p>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 mb-1">Beta Support</h3>
                    <p className="text-xs text-indigo-800">
                        Typical response time is within 24 hours.
                    </p>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex justify-center">
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Contact Support</h1>
                    <p className="text-slate-500 mt-2">Found a bug? Need help setting up? Let us know.</p>
                </div>

                {ticketSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center shadow-sm">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-green-900 mb-2">Ticket Sent!</h2>
                        <p className="text-green-800 mb-4">
                            Your support request <strong>#{Math.floor(Math.random() * 9000) + 1000}</strong> has been submitted.
                        </p>
                        <button 
                            onClick={() => setTicketSent(false)}
                            className="mt-6 text-green-700 font-bold hover:underline"
                        >
                            Submit another request
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSupportSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
                            <select 
                                value={ticketData.type}
                                onChange={e => setTicketData({...ticketData, type: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option>Connection Issue (Gmail/Outlook)</option>
                                <option>AI Generation Error</option>
                                <option>Feature Request</option>
                                <option>Billing / Account</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                            <input 
                                required
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Cannot connect to Outlook"
                                value={ticketData.subject}
                                onChange={e => setTicketData({...ticketData, subject: e.target.value})}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                            <textarea 
                                required
                                className="w-full p-3 border border-slate-200 rounded-lg h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Describe what happened in detail..."
                                value={ticketData.description}
                                onChange={e => setTicketData({...ticketData, description: e.target.value})}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSending}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-70"
                        >
                            {isSending ? 'Sending...' : 'Submit Ticket'}
                            {!isSending && <Send className="w-4 h-4 ml-2" />}
                        </button>
                    </form>
                )}
            </div>
        </div>
    </div>
  );
};
