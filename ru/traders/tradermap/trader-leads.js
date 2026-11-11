(() => {
  const endpoint = 'https://script.google.com/macros/s/AKfycbxW3MR6BZBOBQFngHgLcLakLc3E-P8RKQoedeNOnB_RsaL6FjjvNNTXtMYY_vzvynkk/exec';
  window.qudSendTraderLead = async ({email, telegram = '', message = '', referral = '', entryPoint}) => {
    let stored = '';
    try { stored = localStorage.getItem('qudPilotReferralCode') || ''; } catch (_) {}
    const code = String(referral || stored).trim().toUpperCase().replace(/\s+/g, '');
    const payload = {role:'strategy_owner', email:email.trim(), telegram:telegram.trim(), message:message.trim(), consent:true, source:'landing', entry_point:entryPoint, lead_intent:'tda_trial', referral_code:code};
    const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)});
    if (!response.ok) throw new Error('Lead submission failed');
  };
})();
