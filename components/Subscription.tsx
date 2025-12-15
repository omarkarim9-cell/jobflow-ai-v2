import React, { useState } from 'react';
import { UserProfile, isSubscriptionValid } from '../types';
import { Check, Star, CreditCard, ShieldCheck, Loader2, X, FileText, Info, Clock, AlertTriangle } from 'lucide-react';
import { translations, LanguageCode } from '../services/localization';

interface SubscriptionProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

export const Subscription: React.FC<SubscriptionProps> = ({ userProfile, onUpdateProfile, showNotification }) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fake Credit Card State
  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvc, setCcCvc] = useState('');

  // Localization
  const lang = (userProfile.preferences.language as LanguageCode) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  const isPro = userProfile.plan === 'pro';
  // With types.ts update, this is always true, but we keep the variable for logic consistency
  const isValid = isSubscriptionValid(userProfile);
  const isExpired = isPro && !isValid; // Logic-wise, this might now be impossible if isValid is always true

  const handleUpgrade = () => {
    setIsProcessing(true);
    // Simulate Payment Gateway delay
    setTimeout(() => {
        setIsProcessing(false);
        
        const now = new Date();
        let newExpiryDate = new Date();

        // If currently valid, extend from current expiry. If expired or free, start from today.
        if (isValid && userProfile.subscriptionExpiry) {
            const currentExpiry = new Date(userProfile.subscriptionExpiry);
            const baseDate = currentExpiry > now ? currentExpiry : now;
            newExpiryDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
        } else {
            // New subscription or renewal from expired
            newExpiryDate = new Date(now.setMonth(now.getMonth() + 1));
        }

        const updatedProfile: UserProfile = {
            ...userProfile,
            plan: 'pro',
            subscriptionExpiry: newExpiryDate.toISOString()
        };
        onUpdateProfile(updatedProfile);
        setShowCheckout(false);
        showNotification(t('checkout_success'), 'success');
    }, 2000);
  };

  const getDaysRemaining = () => {
      if (!userProfile.subscriptionExpiry) return 0;
      const now = new Date();
      const expiry = new Date(userProfile.subscriptionExpiry);
      const diffTime = Math.abs(expiry.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return now < expiry ? diffDays : 0;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto w-full">
         <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4">
             <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('sub_title')}</h1>
             <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                 {t('sub_desc')}
             </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             
             {/* FREE PLAN */}
             <div className={`bg-white rounded-2xl p-8 border shadow-sm relative overflow-hidden ${!isPro ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-start mb-6">
                     <div>
                         <h3 className="text-xl font-bold text-slate-900">{t('plan_free')}</h3>
                         <p className="text-sm text-slate-500 mt-1">{t('plan_free_desc')}</p>
                     </div>
                     <div className="text-2xl font-bold text-slate-900">$0<span className="text-sm font-normal text-slate-500">/mo</span></div>
                 </div>

                 <ul className="space-y-4 mb-8">
                     <li className="flex items-center text-slate-700 text-sm">
                         <Check className={`w-5 h-5 text-green-500 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_manual')}
                     </li>
                     <li className="flex items-center text-slate-400 text-sm">
                         <X className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_scan')} (Limit: 3 days)
                     </li>
                     <li className="flex items-center text-slate-400 text-sm">
                         <X className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_auto')}
                     </li>
                     {/* AI Feature Unlocked for Free Plan */}
                     <li className="flex items-center text-slate-700 text-sm font-bold">
                         <Check className={`w-5 h-5 text-green-500 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_ai')} (Included)
                     </li>
                 </ul>

                 <button 
                     disabled={true}
                     className={`w-full py-3 rounded-xl font-bold text-sm cursor-default ${!isPro ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                 >
                     {!isPro ? t('btn_current') : 'Downgrade (Not Available)'}
                 </button>
             </div>

             {/* PRO PLAN */}
             <div className={`bg-white rounded-2xl p-8 border-2 shadow-xl relative overflow-hidden transform md:-translate-y-4 ${isPro ? 'border-indigo-600' : 'border-indigo-100'}`}>
                 {isValid && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center">
                        <Check className="w-3 h-3 mr-1" /> ACTIVE
                    </div>
                 )}
                 {isExpired && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> EXPIRED
                    </div>
                 )}
                 
                 <div className="flex justify-between items-start mb-6">
                     <div>
                         <h3 className="text-xl font-bold text-indigo-900 flex items-center">
                             {t('plan_pro')} 
                             <Star className={`w-5 h-5 text-yellow-400 fill-yellow-400 ${isRtl ? 'mr-2' : 'ml-2'}`} />
                         </h3>
                         <p className="text-sm text-indigo-600/80 mt-1">{t('plan_pro_desc')}</p>
                     </div>
                     <div className="text-2xl font-bold text-slate-900">{t('price_5')}<span className="text-sm font-normal text-slate-500">/mo</span></div>
                 </div>

                 <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-sm font-bold text-indigo-800 mb-2 flex items-center">
                        <FileText className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        Premium Feature:
                    </p>
                    <p className="text-sm text-indigo-700">
                        Unlimited History, Advanced Analytics, and Priority Support.
                    </p>
                 </div>

                 <ul className="space-y-4 mb-8">
                     <li className="flex items-center text-slate-700 text-sm font-medium">
                         <Check className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_manual')}
                     </li>
                     <li className="flex items-center text-slate-700 text-sm font-medium">
                         <Check className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_scan')} (Unlimited)
                     </li>
                     <li className="flex items-center text-slate-700 text-sm font-medium">
                         <Check className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_auto')}
                     </li>
                     <li className="flex items-center text-slate-700 text-sm font-medium">
                         <Check className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                         {t('feature_ai')}
                     </li>
                 </ul>

                 {/* Subscription Status & Actions */}
                 {isPro ? (
                     <div className="space-y-3">
                         <div className={`p-3 rounded-lg border flex items-center justify-between ${isValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                             <div className="flex items-center text-sm font-bold">
                                 <Clock className="w-4 h-4 mr-2" />
                                 {isValid 
                                    ? `${getDaysRemaining()} Days Remaining` 
                                    : `Expired on ${new Date(userProfile.subscriptionExpiry!).toLocaleDateString()}`
                                 }
                             </div>
                         </div>
                         
                         {isExpired && (
                            <button 
                                onClick={() => setShowCheckout(true)}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all flex items-center justify-center animate-pulse"
                            >
                                Renew Subscription
                            </button>
                         )}
                         
                         {isValid && (
                             <button 
                                disabled={true}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-green-100 text-green-700 flex items-center justify-center cursor-default opacity-80"
                             >
                                <Check className="w-4 h-4 mr-2" /> Auto-Renews Active
                             </button>
                         )}
                     </div>
                 ) : (
                     <button 
                        onClick={() => setShowCheckout(true)}
                        className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center"
                     >
                        {t('btn_upgrade')}
                     </button>
                 )}
             </div>
         </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center">
                        <ShieldCheck className={`w-5 h-5 text-green-600 ${isRtl ? 'ml-2' : 'mr-2'}`} /> 
                        {t('checkout_title')}
                    </h3>
                    <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* BETA NOTICE */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                        <Info className="w-5 h-5 text-amber-600 mr-2 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <span className="font-bold block">TRIAL VERSION MODE</span>
                            No actual payment is required. Please enter any random digits to simulate an upgrade and unlock Pro features.
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                        <div>
                            <p className="text-xs text-indigo-600 font-bold uppercase">Total Due Today</p>
                            <p className="text-xl font-bold text-indigo-900">{t('price_5')}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-indigo-600">Pro Plan</p>
                             <p className="text-xs text-indigo-600">30 Days</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Card Number</label>
                        <div className="relative">
                            <CreditCard className={`absolute top-2.5 w-4 h-4 text-slate-400 ${isRtl ? 'left-3' : 'left-3'}`} />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0000 0000 0000 0000"
                                value={ccNumber}
                                onChange={e => setCcNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="MM/YY"
                                value={ccExpiry}
                                onChange={e => setCcExpiry(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">CVC</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="123"
                                value={ccCvc}
                                onChange={e => setCcCvc(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleUpgrade}
                        disabled={!ccNumber || !ccExpiry || !ccCvc || isProcessing}
                        className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center shadow-lg transition-colors"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${t('price_5')}`}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Encrypted via Stripe (Simulated)
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};