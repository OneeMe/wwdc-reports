import {
  articleUrlForRequest,
  buildCommentBody,
  cleanSlug,
  cleanText,
  createIssueComment,
  ensureArticleIssue,
  errorJson,
  findArticleIssue,
  getConfig,
  isConfigured,
  json,
  listIssueComments,
  normalizeIssue,
  readSession,
} from "../../../functions-shared/comments.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const config = getConfig(env);
    const slug = cleanSlug(params.slug);

    if (!isConfigured(config)) {
      return json({ issue: null, comments: [], configured: false });
    }

    const session = await readSession(request, env);
    const issue = await findArticleIssue(config, slug, session?.token);
    const comments = issue ? await listIssueComments(config, issue.number, session?.token) : [];

    return json({
      configured: true,
      issue: normalizeIssue(issue),
      comments,
    });
  } catch (error) {
    return errorJson(error);
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    const config = getConfig(env);
    const slug = cleanSlug(params.slug);

    if (!isConfigured(config)) {
      return json({ error: { message: "GitHub comments are not configured" } }, 503);
    }

    const session = await readSession(request, env);
    if (!session?.token) {
      return json({ error: { message: "GitHub login is required" } }, 401);
    }

    const payload = await request.json();
    const articleTitle = cleanText(payload.articleTitle, 180) || slug;
    const articleUrl = articleUrlForRequest(request, slug, payload.articleUrl);
    const issue = await ensureArticleIssue(config, slug, session.token, articleTitle, articleUrl);
    const body = buildCommentBody({
      body: payload.body,
      selection: payload.selection,
      articleTitle,
      articleUrl,
    });
    const comment = await createIssueComment(config, issue.number, session.token, body);

    return json(
      {
        issue: normalizeIssue(issue),
        comment,
      },
      201
    );
  } catch (error) {
    return errorJson(error);
  }
}
