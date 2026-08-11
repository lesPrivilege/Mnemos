export const Icon = ({ d, size=20, sw=1.6, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {Array.isArray(d) ? d.map((dd,i)=><path key={i} d={dd} />) : <path d={d} />}
  </svg>
)

export const BackIcon = (p) => <Icon d="M14 6l-6 6 6 6" {...p} />
export const PlusIcon = (p) => <Icon d="M12 5v14M5 12h14" {...p} />
export const SearchIcon = (p) => <Icon d="M11 5a6 6 0 110 12 6 6 0 010-12zM21 21l-5-5" {...p} />
export const SettingsIcon = (p) => <Icon d={["M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z","M19 12a7 7 0 00-.1-1.2l1.7-1.3-1.7-3-2 .8a7 7 0 00-2.1-1.2L15 4h-3.5l-.4 2.1A7 7 0 009 7.3l-2-.8-1.7 3 1.7 1.3a7 7 0 000 2.4l-1.7 1.3 1.7 3 2-.8a7 7 0 002.1 1.2l.4 2.1H15l.4-2.1a7 7 0 002.1-1.2l2 .8 1.7-3-1.7-1.3a7 7 0 00.1-1.2z"]} {...p} />
export const EditIcon = (p) => <Icon d="M14 4l6 6-10 10H4v-6L14 4z" {...p} />
export const TrashIcon = (p) => <Icon d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...p} />
export const PinIcon = ({ filled, ...p }) => <Icon d="M12 3l3 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" fill={filled ? 'currentColor' : 'none'} {...p} />
export const StarIcon = ({ filled, ...p }) => <Icon d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" fill={filled ? 'currentColor' : 'none'} {...p} />
export const ArrowRIcon = (p) => <Icon d="M5 12h14M13 6l6 6-6 6" {...p} />
/* 行末去向记：非按钮，只表「此行可入」——与 ArrowR（主行动）分职 */
export const ChevronRIcon = (p) => <Icon d="M9 6l6 6-6 6" {...p} />
export const ArrowLIcon = (p) => <Icon d="M19 12H5M11 6l-6 6 6 6" {...p} />
export const CheckIcon = (p) => <Icon d="M5 12l5 5 9-12" sw={2} {...p} />
export const UploadIcon = (p) => <Icon d="M12 4v12M6 10l6-6 6 6M4 20h16" {...p} />
export const DownloadIcon = (p) => <Icon d="M12 4v12M6 14l6 6 6-6M4 20h16" {...p} />
export const PasteIcon = (p) => <Icon d="M9 4h6v2h2a1 1 0 011 1v13a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1h2V4z" {...p} />
export const LayersIcon = (p) => <Icon d="M12 3l9 5-9 5-9-5 9-5zm0 8l9 5-9 5-9-5" {...p} />
export const SparkIcon = (p) => <Icon d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" {...p} />
export const CopyIcon = (p) => <Icon d="M8 8h11v11H8zM5 5h11v3M5 5v11h3" {...p} />
export const MoreIcon = (p) => <Icon d="M12 5h.01M12 12h.01M12 19h.01" sw={2.5} {...p} />
export const SunIcon = (p) => <Icon d={["M12 6V3M12 21v-3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1","M12 8a4 4 0 100 8 4 4 0 000-8z"]} {...p} />
export const MoonIcon = (p) => <Icon d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" {...p} />

export const XIcon = (p) => <Icon d="M18 6L6 18M6 6l12 12" {...p} />
/* 告知类之错的非色线索：danger 退墨阶后，「错」不可只靠色识别（记-25） */
export const AlertIcon = (p) => <Icon d={["M12 3l9 17H3z", "M12 9v4", "M12 16.5h.01"]} sw={1.8} {...p} />

export const RefreshIcon = (p) => <Icon d={["M23 4v6h-6M1 20v-6h6","M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"]} {...p} />
export const FlameIcon = (p) => <Icon d="M12 2c0 0-5 4.5-5 9a5 5 0 0010 0c0-4.5-5-9-5-9zm0 12a2 2 0 110-4 2 2 0 010 4z" sw={1.4} fill="currentColor" {...p} />
export const PencilIcon = (p) => <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" {...p} />
export const BookmarkIcon = ({ filled, ...p }) => <Icon d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" fill={filled ? 'currentColor' : 'none'} {...p} />
export { default as MnemosMark } from './MnemosMark'
