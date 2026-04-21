export function StatInput({ label, value, onChange, type = 'number', min, max, step = 1, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          if (type === 'number') {
            const v = e.target.value === '' ? null : Number(e.target.value)
            onChange(v)
          } else {
            onChange(e.target.value)
          }
        }}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white
                   focus:outline-none focus:border-red-500 w-full"
      />
    </div>
  )
}
