import { objectEntries } from './split.js';

export function getTopicList(rawData) {
  return objectEntries(rawData?.topics)
    .map(([id, topic]) => ({
      id: String(topic?.id ?? id),
      title: String(topic?.title ?? id),
      raw: topic
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function findTopics(rawData, names, { fuzzy = false } = {}) {
  const topics = getTopicList(rawData);
  const requested = Array.isArray(names) ? names : [names];
  const matches = [];
  const unmatched = [];

  for (const name of requested.filter(Boolean)) {
    const needle = String(name).trim();
    const lower = needle.toLowerCase();
    let topic = topics.find((item) => item.title === needle)
      ?? topics.find((item) => item.title.toLowerCase() === lower);

    if (!topic && fuzzy) {
      topic = topics.find((item) => item.title.toLowerCase().includes(lower));
    }

    if (topic) matches.push(topic);
    else unmatched.push(needle);
  }

  return { matches, unmatched, available: topics };
}

export function sessionsForTopics(rawData, topics) {
  const topicIds = new Set(topics.map((topic) => String(topic.id)));
  const topicTitles = new Map(topics.map((topic) => [String(topic.id), topic.title]));
  const byTopic = new Map(topics.map((topic) => [topic.title, []]));

  for (const [sessionId, session] of objectEntries(rawData?.videos)) {
    const ids = new Set();
    if (session?.primaryTopicID !== undefined) ids.add(String(session.primaryTopicID));
    for (const id of session?.topicIds ?? []) ids.add(String(id));

    for (const id of ids) {
      if (!topicIds.has(id)) continue;
      const title = topicTitles.get(id);
      byTopic.get(title).push({
        id: sessionId,
        code: String(sessionId).split('-').pop(),
        title: session?.title ?? '',
        description: session?.description ?? '',
        url: session?.webPermalink ?? ''
      });
    }
  }

  return Object.fromEntries([...byTopic.entries()].map(([topic, sessions]) => [
    topic,
    sessions.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
  ]));
}

export function topicsAndVideos(rawData) {
  const topics = getTopicList(rawData);
  const byTopic = sessionsForTopics(rawData, topics);
  return topics.map((topic) => ({
    id: topic.id,
    name: topic.title,
    videos: byTopic[topic.title].map((session) => ({
      session_id: session.id,
      code: session.code,
      title: session.title,
      url: session.url
    }))
  }));
}
