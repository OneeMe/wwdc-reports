const DEFAULT_REPO = "SwiftGGTeam/wwdc-quick-look";
const DEFAULT_SCOPE = "public_repo";
const DEFAULT_LABEL = "article-comment";
const DEFAULT_API_VERSION = "2022-11-28";
const SESSION_COOKIE = "wwdc_comments_session";
const OAUTH_COOKIE = "wwdc_comments_oauth";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_MAX_AGE_SECONDS = 60 * 10;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function json(data, init = {}) {
  const status = typeof init === "number" ? init : init.status || 200;
  const headers = new Headers(typeof init === "number" ? undefined : init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorJson(error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = error?.message || "Unexpected server error";
  return json({ error: { message } }, status);
}

export function getConfig(env) {
  const repoFullName = env.GITHUB_COMMENTS_REPO || DEFAULT_REPO;
  const [owner, repo] = repoFullName.split("/");

  if (!owner || !repo) {
    throw new HttpError(500, "GITHUB_COMMENTS_REPO must use owner/repo format");
  }

  return {
    owner,
    repo,
    repoFullName,
    label: env.GITHUB_COMMENTS_LABEL || DEFAULT_LABEL,
    scope: env.GITHUB_COMMENTS_SCOPE || DEFAULT_SCOPE,
    clientId: env.GITHUB_COMMENTS_CLIENT_ID || "",
    clientSecret: env.GITHUB_COMMENTS_CLIENT_SECRET || "",
    sessionSecret: env.GITHUB_COMMENTS_SESSION_SECRET || "",
    apiVersion: env.GITHUB_COMMENTS_API_VERSION || DEFAULT_API_VERSION,
  };
}

export function isConfigured(config) {
  return Boolean(config.clientId && config.clientSecret && config.sessionSecret);
}

export function publicConfig(config) {
  return {
    enabled: isConfigured(config),
    loginUrl: "/api/comments/auth/login",
    repo: config.repoFullName,
  };
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const cookies = new Map();

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies.set(name, valueParts.join("="));
  }

  return cookies;
}

export function serializeCookie(request, name, value, options = {}) {
  const url = new URL(request.url);
  const parts = [`${name}=${value}`, `Path=${options.path || "/"}`, `SameSite=${options.sameSite || "Lax"}`];

  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (url.protocol === "https:") parts.push("Secure");
  if (Number.isInteger(options.maxAge)) parts.push(`Max-Age=${options.maxAge}`);

  return parts.join("; ");
}

export function clearCookie(request, name, path = "/") {
  return serializeCookie(request, name, "", { path, maxAge: 0 });
}

export function cleanSlug(value) {
  const slug = String(value || "").trim();
  if (!/^[a-z0-9-]{3,80}$/i.test(slug)) {
    throw new HttpError(400, "Invalid article slug");
  }
  return slug;
}

export function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

export function safeReturnTo(value) {
  const fallback = "/articles";
  const returnTo = String(value || fallback);

  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\") || returnTo.includes("\n")) {
    return fallback;
  }

  return returnTo;
}

export function articleUrlForRequest(request, slug, value) {
  const origin = new URL(request.url).origin;

  try {
    const url = new URL(String(value || ""), origin);
    if (url.origin === origin && url.pathname.startsWith("/articles/")) {
      return url.toString();
    }
  } catch {
    // Fall through to the canonical local article URL.
  }

  return new URL(`/articles/${slug}`, origin).toString();
}

export function createIssueMarker(slug) {
  return `<!-- wwdc-quick-look-comment:${slug} -->`;
}

export function buildIssueTitle(slug, articleTitle) {
  const title = cleanText(articleTitle, 140) || slug;
  return `Comments: ${title} (${slug})`.slice(0, 250);
}

export function buildIssueBody(slug, articleTitle, articleUrl) {
  const marker = createIssueMarker(slug);
  const title = cleanText(articleTitle, 180) || slug;
  return [
    marker,
    "",
    `Article: [${title}](${articleUrl})`,
    "",
    "This issue stores reader comments for the WWDC Quick Look article above.",
  ].join("\n");
}

export function buildCommentBody({ body, selection, articleTitle, articleUrl }) {
  const cleanedBody = cleanText(body, 5000);
  const cleanedSelection = cleanText(selection, 800);
  const parts = [];

  if (!cleanedBody) {
    throw new HttpError(400, "Comment body is required");
  }

  if (cleanedSelection) {
    const quote = cleanedSelection
      .split(/\r?\n/)
      .map((line) => `> ${line.trim()}`)
      .join("\n");
    parts.push(quote);
  }

  parts.push(cleanedBody);

  if (articleUrl) {
    const title = cleanText(articleTitle, 160) || "article";
    parts.push(`---\nFrom [${title}](${articleUrl})`);
  }

  return parts.join("\n\n");
}

export function normalizeIssue(issue) {
  if (!issue) return null;
  return {
    number: issue.number,
    title: issue.title,
    htmlUrl: issue.html_url,
    comments: issue.comments,
    state: issue.state,
  };
}

export function normalizeComment(comment) {
  return {
    id: comment.id,
    htmlUrl: comment.html_url,
    body: comment.body || "",
    bodyHtml: comment.body_html || "",
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    authorAssociation: comment.author_association,
    user: comment.user
      ? {
          login: comment.user.login,
          avatarUrl: comment.user.avatar_url,
          htmlUrl: comment.user.html_url,
        }
      : null,
  };
}

export async function githubFetch(config, path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("accept", options.accept || "application/vnd.github+json");
  headers.set("user-agent", "wwdc-quick-look-comments");
  headers.set("x-github-api-version", config.apiVersion);

  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  if (options.body !== undefined) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    throw new HttpError(response.status, data?.message || `GitHub API request failed with ${response.status}`, data);
  }

  return data;
}

export async function findArticleIssue(config, slug, token) {
  const marker = createIssueMarker(slug);
  const labelParams = new URLSearchParams({
    state: "all",
    labels: config.label,
    per_page: "100",
    sort: "created",
    direction: "desc",
  });
  const fallbackParams = new URLSearchParams(labelParams);
  fallbackParams.delete("labels");

  const issue = await findIssueInPage(config, labelParams, marker, slug, token);
  if (issue) return issue;

  return findIssueInPage(config, fallbackParams, marker, slug, token);
}

export async function ensureArticleIssue(config, slug, token, articleTitle, articleUrl) {
  const existing = await findArticleIssue(config, slug, token);
  if (existing) return existing;

  const issue = await githubFetch(config, `/repos/${config.owner}/${config.repo}/issues`, {
    method: "POST",
    token,
    body: {
      title: buildIssueTitle(slug, articleTitle),
      body: buildIssueBody(slug, articleTitle, articleUrl),
      labels: config.label ? [config.label] : undefined,
    },
  });

  return issue;
}

export async function listIssueComments(config, issueNumber, token) {
  const comments = await githubFetch(
    config,
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=100`,
    {
      token,
      accept: "application/vnd.github.full+json",
    }
  );

  return Array.isArray(comments) ? comments.map(normalizeComment) : [];
}

export async function createIssueComment(config, issueNumber, token, body) {
  const comment = await githubFetch(config, `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    token,
    body: { body },
  });

  return normalizeComment(comment);
}

export async function readSession(request, env) {
  const config = getConfig(env);
  if (!config.sessionSecret) return null;

  const cookie = parseCookies(request).get(SESSION_COOKIE);
  if (!cookie) return null;

  try {
    return await unseal(config.sessionSecret, cookie);
  } catch {
    return null;
  }
}

export async function sessionCookie(request, config, session) {
  const sealed = await seal(config.sessionSecret, {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  return serializeCookie(request, SESSION_COOKIE, sealed, { maxAge: SESSION_MAX_AGE_SECONDS });
}

export function clearSessionCookie(request) {
  return clearCookie(request, SESSION_COOKIE);
}

export async function oauthCookie(request, config, payload) {
  const sealed = await seal(config.sessionSecret, {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + OAUTH_MAX_AGE_SECONDS,
  });
  return serializeCookie(request, OAUTH_COOKIE, sealed, {
    path: "/api/comments/auth",
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });
}

export async function readOauthCookie(request, config) {
  const cookie = parseCookies(request).get(OAUTH_COOKIE);
  if (!cookie) return null;
  return unseal(config.sessionSecret, cookie);
}

export function clearOauthCookie(request) {
  return clearCookie(request, OAUTH_COOKIE, "/api/comments/auth");
}

export async function exchangeOAuthCode(config, request, code, codeVerifier) {
  const redirectUri = new URL("/api/comments/auth/callback", new URL(request.url).origin).toString();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "wwdc-quick-look-comments",
    },
    body: params.toString(),
  });
  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new HttpError(401, data.error_description || data.error || "GitHub OAuth failed", data);
  }

  return data.access_token;
}

export async function getGitHubUser(config, token) {
  const user = await githubFetch(config, "/user", { token });
  return {
    login: user.login,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
  };
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function findIssueInPage(config, params, marker, slug, token) {
  const issues = await githubFetch(config, `/repos/${config.owner}/${config.repo}/issues?${params.toString()}`, {
    token,
    accept: "application/vnd.github.full+json",
  });

  if (!Array.isArray(issues)) return null;

  return (
    issues.find((issue) => {
      if (issue.pull_request) return false;
      return String(issue.body || "").includes(marker) || String(issue.title || "").includes(`(${slug})`);
    }) || null
  );
}

async function seal(secret, payload) {
  const key = await secretKey(secret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(cipher))}`;
}

async function unseal(secret, value) {
  const [version, ivValue, cipherValue] = String(value).split(".");
  if (version !== "v1" || !ivValue || !cipherValue) {
    throw new Error("Invalid sealed value");
  }

  const key = await secretKey(secret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(ivValue) },
    key,
    base64UrlToBytes(cipherValue)
  );
  const payload = JSON.parse(decoder.decode(plain));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired sealed value");
  }

  return payload;
}

async function secretKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
