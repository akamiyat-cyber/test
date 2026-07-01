export function Editor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className="h-full w-full resize-none border-0 bg-transparent p-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
    />
  );
}
