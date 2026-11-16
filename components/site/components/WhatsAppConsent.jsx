'use client';
export default function WhatsAppConsent({checked,onChange,disabled=false}){
  if(process.env.NEXT_PUBLIC_LEADS_ENABLED!=='1')return null;
  return <label className="booking-inline-check">
    <input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)} disabled={disabled}/>
    <span>I agree to receive WhatsApp messages from Shiv Patel about this inquiry and arranging a call. Optional. Reply STOP to opt out.</span>
  </label>;
}
