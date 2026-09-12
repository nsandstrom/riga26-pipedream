interface TabDef<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-5 border-b border-zinc-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`-mb-px border-b-2 px-0.5 py-2 text-sm font-medium transition ${
            active === tab.id
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
