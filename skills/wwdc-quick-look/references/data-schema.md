# WWDC Dataset Schema

Published at `https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/`.

## index.json

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-31T11:57:17.054Z",
  "years": [
    {
      "year": "2025",
      "eventId": "wwdc2025",
      "eventShort": "wwdc25",
      "displayName": "WWDC25",
      "sessionCount": 122,
      "topicCount": 19,
      "locales": ["en"],
      "files": {
        "metadata": "data/wwdc25/raw_data.json",
        "transcriptsManifest": "data/wwdc25/transcripts-en/_manifest.json",
        "transcriptDir": "data/wwdc25/transcripts-en/"
      }
    }
  ]
}
```

## raw_data.json

```json
{
  "events": {
    "wwdc2025": {
      "id": "wwdc2025",
      "name": "WWDC25",
      "eventShort": "wwdc25"
    }
  },
  "topics": {
    "swift": {
      "id": "swift",
      "title": "Swift"
    }
  },
  "videos": {
    "wwdc2025-238": {
      "id": "wwdc2025-238",
      "eventId": "wwdc2025",
      "eventContentId": "238",
      "title": "Customize your app for Assistive Access",
      "description": "assistive access is a distinctive...",
      "webPermalink": "https://developer.apple.com/videos/play/wwdc2025/238/",
      "primaryTopicID": "accessibility-inclusion",
      "topicIds": ["accessibility-inclusion"],
      "resources": [
        {
          "type": "document",
          "title": "AssistiveAccess",
          "url": "https://developer.apple.com/documentation/SwiftUI/AssistiveAccess"
        }
      ],
      "codeSnippets": [
        {
          "title": "Create a scene for Assistive Access",
          "seconds": 321,
          "timestamp": "5:21",
          "url": "https://developer.apple.com/videos/play/wwdc2025/238/?time=321",
          "code": "import SwiftUI"
        }
      ]
    }
  }
}
```

### Video fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Full ID, e.g. `wwdc2025-238` |
| `eventContentId` | string | Session code, e.g. `238` |
| `title` | string | Session title |
| `description` | string | Short description from Apple |
| `webPermalink` | string | Apple Developer video page URL |
| `primaryTopicID` | string | Main topic ID |
| `topicIds` | string[] | All related topic IDs |
| `resources` | object[] | Optional Resources links from the Apple session page |
| `codeSnippets` | object[] | Optional Code tab snippets from the Apple session page |

### Resource fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Apple page class/category, e.g. `document`, `download`, `guide` |
| `title` | string | Link label |
| `url` | string | Absolute URL |

### Code snippet fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Snippet label from the Code tab |
| `seconds` | number | Video timestamp in seconds |
| `timestamp` | string | Display timestamp |
| `url` | string | Apple video URL with `?time=` |
| `code` | string | Raw code text |

## Transcript file

Plain text, one timestamped line per sentence:

```
00:06 Hi everyone. My name is Anne,
00:08 and I'm a member of the Accessibility team at Apple.
```
