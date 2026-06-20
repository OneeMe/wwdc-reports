import { clearSessionCookie, json } from "../../../functions-shared/comments.js";

export function onRequestPost({ request }) {
  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": clearSessionCookie(request),
      },
    }
  );
}
