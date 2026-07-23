export default function Stars({ value=5 }: { value?: number }) {
  const v = Math.round((value||0)*2)/2;
  return (
    <div aria-label={`${v}/5`} className="flex items-center gap-1 text-[#B89C6D]">
      {Array.from({length:5}).map((_,i)=>(
        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={i+1<=v ? "currentColor":"none"} stroke="currentColor"><path d="m12 17.27 6.18 3.73-1.64-7.03L21 9.24l-7.19-.62L12 2 10.19 8.62 3 9.24l4.46 4.73L5.82 21z"/></svg>
      ))}
    </div>
  );
}
