/** 인쇄용 책 아이콘 SVG */
export function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="52" viewBox="0 0 48 52" fill="none">
      <path d="M6 10a3 3 0 013-3h13v38H9a3 3 0 01-3-3V10z"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M42 10a3 3 0 00-3-3H26v38h13a3 3 0 003-3V10z"
        fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="5" width="4" height="42" rx="1.5" fill="currentColor" />
      <line x1="11" y1="16" x2="18" y2="16" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="11" y1="20" x2="18" y2="20" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="11" y1="24" x2="16" y2="24" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="16" x2="37" y2="16" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="20" x2="37" y2="20" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <line x1="30" y1="24" x2="35" y2="24" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
      <path d="M34 7V1l3 2.5L40 1v6" fill="currentColor" fillOpacity=".5" />
    </svg>
  );
}
