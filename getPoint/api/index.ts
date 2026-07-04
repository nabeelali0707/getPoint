import { handler } from "../apps/api/src/server.js";

export default async function (req, res) {
  // Vercel passes Node.js request/response objects
  return handler(req, res);
}
