import { errorJson, getConfig, json, publicConfig } from "../../../functions-shared/comments.js";

export function onRequestGet({ env }) {
  try {
    return json(publicConfig(getConfig(env)));
  } catch (error) {
    return errorJson(error);
  }
}
