/**
 * Input Sanitization Middleware
 * Recursively strips XSS, NoSQL operator injection, and suspicious SQLi patterns
 * from req.body, req.query, and req.params.
 */

// Patterns to neutralize
const XSS_PATTERNS = /<[^>]*>|javascript:|data:\s*text\/html/gi;
const SQLI_PATTERNS = /(--|\/\*|\*\/|;\s*DROP|;\s*DELETE|UNION\s+ALL\s+SELECT|UNION\s+SELECT)/gi;

function cleanValue(val) {
  if (typeof val === 'string') {
    // Preserve base64 image data URIs for checkpoint photos
    if (val.startsWith('data:image/') || val.startsWith('data:video/')) {
      return val;
    }

    // Strip XSS tags
    let cleaned = val.replace(XSS_PATTERNS, '');

    // Normalize dangerous SQL characters in free-text fields
    cleaned = cleaned.replace(SQLI_PATTERNS, '');

    return cleaned.trim();
  }

  if (Array.isArray(val)) {
    return val.map((item) => cleanValue(item));
  }

  if (val !== null && typeof val === 'object') {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(val)) {
      // Reject NoSQL operator injection keys (e.g. keys starting with $)
      if (key.startsWith('$')) {
        console.warn(`[SECURITY:INJECTION_STRIPPED] Disallowed operator key detected: ${key}`);
        continue;
      }
      sanitizedObj[key] = cleanValue(value);
    }
    return sanitizedObj;
  }

  return val;
}

function sanitizeMiddleware(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = cleanValue(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = cleanValue(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = cleanValue(req.params);
    }

    next();
  } catch (err) {
    console.error('[SECURITY:SANITIZE_ERROR]', err);
    return res.status(400).json({
      success: false,
      error: 'Malformed input data rejected by security sanitizer.',
    });
  }
}

module.exports = sanitizeMiddleware;
