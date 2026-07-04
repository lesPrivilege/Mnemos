# Mnemos Backup Format

This document freezes the backup JSON contract for Mnemos v1.3.x. Backups are
local-first data artifacts: they must remain readable by future Mnemos versions,
including after storage internals move from localStorage to IndexedDB.

## Compatibility Promise

Any backup ever produced by Mnemos must import into any future version of Mnemos.

- Additive fields do not require a version bump.
- Removing, renaming, or changing the meaning of an existing field requires a
  version bump and an importer that keeps reading every prior version.
- Unknown fields should be preserved where practical or ignored safely.
- Importers must accept legacy payloads that predate module-level `version`.

## Storage Backend Note

As of R4+1, the big records `mnemos-data` and `examprep-questions` live in
IndexedDB only; `setCached` no longer dual-writes them to localStorage. A
device that still has a pre-R4 localStorage copy migrates it into IndexedDB on
first hydrate and then deletes the localStorage copy once that write is
confirmed — this migration read path is retained indefinitely so any
pre-R4 device can still recover its data on upgrade, no matter how long it
was left on an old build. Backup import/export is unaffected because it reads
and writes through the same module loaders.

## Full Backup

Settings → 完整备份 exports one JSON object:

```json
{
  "version": 1,
  "exportedAt": "2026-07-04T00:00:00.000Z",
  "flashcard": {},
  "quiz": {},
  "reading": {}
}
```

| Field | Type | Meaning |
|---|---|---|
| `version` | number | Full-backup envelope version. Current value: `1`. |
| `exportedAt` | ISO string | Export timestamp. |
| `flashcard` | object | Flashcard module payload. |
| `quiz` | object | Quiz module payload. |
| `reading` | object | Reading module payload. |

The full-backup envelope and each module payload have independent versions.

## Flashcard Payload

Current shape:

```json
{
  "version": 1,
  "decks": [],
  "cards": []
}
```

`mnemos-data` is persisted in the same wrapper shape. Legacy backups without
`version` are still accepted and are rewritten as version `1` on the next save.

### `decks[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable deck id. |
| `name` | string | Display name. |
| `pinned` | boolean | Whether the deck is pinned on the home screen. Missing means `false`. |
| `createdAt` | ISO string | Creation timestamp. |

### `cards[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable card id. |
| `deckId` | string | Owning deck id. |
| `front` | string | Prompt / question side. |
| `back` | string | Answer / reference side. |
| `type` | string | `recall` participates in review; `reference` does not. Missing means `recall`. |
| `chapter` | string | Coarse grouping label. |
| `section` | string | Fine grouping label. |
| `easiness` | number | SM-2 easiness factor. Default `2.5`. |
| `interval` | number | Current interval in days. |
| `repetitions` | number | Consecutive successful review count. |
| `dueDate` | `YYYY-MM-DD` | Local due date. |
| `starred` | boolean | User favorite flag. Missing means `false`. |
| `lapses` | number | Number of failed reviews after learning. Missing means `0`. |
| `suspended` | boolean | Whether review scheduling is paused. Missing means `false`. |
| `leech` | boolean | Whether the card has crossed the leech threshold. Missing means `false`. |
| `createdAt` | ISO string | Creation timestamp. |
| `updatedAt` | ISO string | Last mutation / review timestamp. |

Deck-level flashcard export uses the same shape, with one deck and that deck's
cards.

## Quiz Payload

Current shape:

```json
{
  "version": 1,
  "questions": [],
  "progress": {},
  "starred": [],
  "exportedAt": "2026-07-04T00:00:00.000Z"
}
```

Quiz storage remains flat across `examprep-*` keys. The local marker key
`examprep-schema-version = "1"` exists for future migrations; it is not the backup
payload itself.

### `questions[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable question id. |
| `source` | string | Source book / dataset label. |
| `subject` | string | Subject namespace. |
| `chapter` | string | Chapter label. |
| `section` | string | Section label. |
| `type` | string | `choice` or `review`. |
| `question` | string | Prompt body, usually Markdown. |
| `options` | string[] | Choice options. Empty for review questions. |
| `answer` | string | Expected answer or reference answer. |
| `explanation` | string | Explanation / solution text. |
| `solution_path` | string \| null | Optional external solution asset path. |
| `metadata` | object | Optional upstream metadata such as origin, exam years, frequency, difficulty. |

### `progress`

Object keyed by question id:

| Field | Type | Meaning |
|---|---|---|
| `attempts` | number | Total recorded attempts. |
| `last_attempt` | Unix seconds | Last attempt time. |
| `status` | string | `todo`, `correct`, or `wrong`. |
| `correct_count` | number | Number of correct attempts. |
| `wrong_count` | number | Number of wrong attempts. |
| `wrongStreak` | number | Consecutive wrong attempts. |
| `rightStreak` | number | Consecutive right attempts. |

### `starred[]`

Array of starred question ids.

## Reading Payload

Current shape:

```json
{
  "version": 1,
  "reading-collections": [],
  "reading-documents": [],
  "reading-highlights": [],
  "reading-bookmarks": [],
  "reading-stats": {},
  "reading-settings": {},
  "bodies": {}
}
```

Reading storage remains flat across `reading-*` keys, with document bodies stored
in IndexedDB. The local marker key `reading-schema-version = "1"` exists for future
migrations; the backup payload carries its own `version`.

### `reading-collections[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable collection id. |
| `name` | string | Display name. |
| `icon` | string | Collection icon. |
| `pinned` | boolean | Whether the collection is pinned. |
| `createdAt` | ISO string | Creation timestamp. |

### `reading-documents[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable document id. |
| `collectionId` | string | Owning collection id. |
| `title` | string | Display title. |
| `format` | string | Source format, such as `md`, `tex`, or `txt`. |
| `hasBody` | boolean | Whether body text lives in IndexedDB / backup `bodies`. |
| `createdAt` | ISO string | Creation timestamp. |
| `lastReadAt` | ISO string \| null | Last reading timestamp. |
| `scrollPct` | number | Last scroll position percentage. |
| `content` | string | Legacy embedded body field. Importers may still see it. |

### `reading-highlights[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable highlight id. |
| `docId` | string | Owning document id. |
| `selectedText` | string | Highlighted text. |
| `contextSnippet` | string | Surrounding context for recovery. |
| `textOffset` | number | Character offset anchor, or `-1` when unavailable. |
| `length` | number | Highlight length. |
| `note` | string | Optional user note. |
| `createdAt` | ISO string | Creation timestamp. |

### `reading-bookmarks[]`

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable bookmark id. |
| `docId` | string | Owning document id. |
| `title` | string | Bookmark label. |
| `scrollPct` | number | Bookmark position percentage. |
| `createdAt` | ISO string | Creation timestamp. |

### `reading-stats`

Object containing reading counters and activity history. Current known fields
include `totalMinutes`, `docsCompleted`, and date/session-derived stats. Missing
fields are treated as zero/default by the app.

### `reading-settings`

Reader preferences. Current known fields:

| Field | Type | Meaning |
|---|---|---|
| `fontSize` | number | Reader font size. |
| `lineHeight` | number | Reader line height. |
| `margins` | number | Reader horizontal margin. |

### `bodies`

Object keyed by document id. Each value is the full source text for that document.
This is how reading document bodies survive the localStorage → IndexedDB split.

## Quarantine Export

When a localStorage key exists but fails JSON parse or shape validation, Mnemos
copies the raw string into an internal quarantine record:

```json
{
  "raw": "{oops",
  "quarantinedAt": "2026-07-04T00:00:00.000Z",
  "error": "parse error message"
}
```

Settings exports only the `raw` string as a plain text file named:

```text
mnemos-quarantine-<key>-<date>.txt
```

That text file is intentionally not auto-repaired in-app. The intended recovery
path is: export the raw string, repair it externally, then re-import a valid JSON
backup through the normal restore flow.
