interface Props {
  value: string
  onChange: (value: string) => void
}

const languages = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: '영어', flag: '🇺🇸' },
  { code: 'zh', label: '중국어', flag: '🇨🇳' },
  { code: 'vi', label: '베트남어', flag: '🇻🇳' },
]

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
            value === lang.code
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 text-gray-600'
          }`}
        >
          <span className="text-xl">{lang.flag}</span>
          <span className="font-medium">{lang.label}</span>
        </button>
      ))}
    </div>
  )
}
