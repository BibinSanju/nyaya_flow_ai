/**
 * Small in-memory fixed-window rate limiter keyed by client IP.
 * Good enough for a single Render instance; resets when the service restarts.
 */
const rateLimit = ({ max, windowMs, message }) => {
  const hits = new Map();

  // Drop expired entries so the map doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (now > entry.resetAt) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, error: message || `Too many requests. Try again in ${retryAfter} seconds.` });
    }
    next();
  };
};

module.exports = { rateLimit };
