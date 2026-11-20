/* Recall weekday coding assignments. Completion is stored on synced daily records. */
(function (root) {
  'use strict';

  const start = '2026-11-23';
  const topics = root.RecallCodingCurriculum.map(([name, entries], topicIndex) => ({
    name,
    sessions: entries.map(([title, minutes, problems], sessionIndex) => ({
      id: topicIndex + ':' + sessionIndex,
      topic: name,
      title,
      minutes,
      problems
    }))
  }));
  const sessionsById = new Map(topics.flatMap(topic => topic.sessions).map(session => [session.id, session]));

  function weekday(date) {
    return new Date(date + 'T12:00:00Z').getUTCDay();
  }

  function shift(date, days) {
    const time = new Date(date + 'T12:00:00Z');
    time.setUTCDate(time.getUTCDate() + days);
    return time.toISOString().slice(0, 10);
  }

  const weekend = date => weekday(date) === 0 || weekday(date) === 6;
  const nextMonday = date => shift(date, ((8 - weekday(date)) % 7) || 7);

  function assignmentOn(date, completed) {
    let lastTopic = null;
    let lastFinished = '';
    for (const topic of topics) {
      const outstanding = topic.sessions.find(session => !completed.has(session.id));
      if (outstanding) {
        if (!lastFinished || date >= nextMonday(lastFinished)) return outstanding;
        break;
      }
      lastTopic = topic;
      lastFinished = topic.sessions.map(session => completed.get(session.id)).sort().at(-1);
    }
    const mixed = completed.size === sessionsById.size && date >= nextMonday(lastFinished);
    const elapsedDays = (Date.parse(date) - Date.parse(start)) / 86400000;
    const review = mixed ? topics[elapsedDays % topics.length].sessions[weekday(date) - 1] : lastTopic.sessions.at(-1);
    return {
      ...review,
      id: 'review:' + date,
      title: mixed ? 'Mixed review' : 'Recall and practice',
      minutes: 25,
      problems: [review.problems.at(-1)],
      review: true
    };
  }

  function assignmentFor(date, today, records) {
    if (date < start || weekend(date)) return null;
    const recorded = records.find(record => record.date === date)?.codingPractice;
    const completed = new Map();
    for (const record of records) {
      const attempt = record.codingPractice;
      if (record.date < start || record.date >= date || !attempt?.done || !sessionsById.has(attempt.id)) continue;
      const previous = completed.get(attempt.id);
      if (!previous || record.date < previous) completed.set(attempt.id, record.date);
    }

    // A missed actual day advances nothing. Farther dates preview an on-time
    // schedule beginning with tomorrow's current assignment.
    for (let day = today < start ? start : shift(today, 1); day < date && completed.size < sessionsById.size; day = shift(day, 1)) {
      if (weekend(day)) continue;
      const session = assignmentOn(day, completed);
      if (!session.review) completed.set(session.id, day);
    }

    const assigned = assignmentOn(date, completed);
    const savedSession = sessionsById.get(recorded?.id);
    const session = recorded?.done && savedSession ? savedSession : assigned;
    return {...session, done: recorded?.id === session.id && recorded.done === true};
  }

  root.RecallCodingPractice = {start, assignmentFor};
})(typeof window === 'undefined' ? globalThis : window);
