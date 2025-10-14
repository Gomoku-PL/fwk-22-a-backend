/**
 * XSS Prevention Utilities
 * Implements comprehensive sanitization for user-generated content
 */

/**
 * HTML encode special characters to prevent XSS attacks
 */
export function htmlEncode(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * HTML decode previously encoded characters
 */
export function htmlDecode(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Strip HTML tags completely
 */
export function stripHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user input for safe storage and display
 */
export function sanitizeInput(input, options = {}) {
  const {
    allowHtml = false,
    maxLength = 1000,
    trimWhitespace = true
  } = options;
  
  if (typeof input !== 'string') {
    return input;
  }
  
  let sanitized = input;
  
  // Trim whitespace if requested
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }
  
  // Enforce length limits
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Handle HTML content
  if (allowHtml) {
    // For HTML content, use more sophisticated sanitization
    sanitized = sanitizeHtml(sanitized);
  } else {
    // For plain text, encode all HTML
    sanitized = htmlEncode(sanitized);
  }
  
  return sanitized;
}

/**
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potentially dangerous tags and attributes
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 
    'button', 'textarea', 'select', 'option', 'meta', 'link', 
    'style', 'title', 'base', 'head', 'html', 'body'
  ];
  
  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'javascript:', 'vbscript:',
    'data:', 'src', 'href'
  ];
  
  let sanitized = input;
  
  // Remove dangerous tags
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
    
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gis');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });
  
  // Remove dangerous attributes
  dangerousAttributes.forEach(attr => {
    const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gis');
    sanitized = sanitized.replace(regex, '');
  });
  
  return sanitized;
}

/**
 * Sanitize user profile data
 */
export function sanitizeProfile(profileData) {
  const sanitized = {};
  
  if (profileData.username) {
    sanitized.username = sanitizeInput(profileData.username, {
      maxLength: 50,
      allowHtml: false
    });
  }
  
  if (profileData.email) {
    sanitized.email = sanitizeInput(profileData.email, {
      maxLength: 100,
      allowHtml: false
    });
  }
  
  if (profileData.displayName) {
    sanitized.displayName = sanitizeInput(profileData.displayName, {
      maxLength: 100,
      allowHtml: false
    });
  }
  
  if (profileData.bio) {
    sanitized.bio = sanitizeInput(profileData.bio, {
      maxLength: 500,
      allowHtml: true // Allow some HTML in bio but sanitize it
    });
  }
  
  return sanitized;
}

/**
 * Sanitize game-related user input
 */
export function sanitizeGameInput(gameData) {
  const sanitized = {};
  
  if (gameData.playerName) {
    sanitized.playerName = sanitizeInput(gameData.playerName, {
      maxLength: 30,
      allowHtml: false
    });
  }
  
  if (gameData.gameTitle) {
    sanitized.gameTitle = sanitizeInput(gameData.gameTitle, {
      maxLength: 100,
      allowHtml: false
    });
  }
  
  if (gameData.comment) {
    sanitized.comment = sanitizeInput(gameData.comment, {
      maxLength: 300,
      allowHtml: false
    });
  }
  
  return sanitized;
}

/**
 * Validate and sanitize URL inputs
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
  
  // Remove javascript: and data: protocols
  if (url.match(/^(javascript|data|vbscript):/i)) {
    return '';
  }
  
  // Only allow http, https, and relative URLs
  if (!url.match(/^(https?:\/\/|\/)/i)) {
    return '';
  }
  
  return htmlEncode(url);
}

/**
 * Content Security Policy headers helper
 */
export function getCSPHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Consider removing unsafe-inline in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  };
}

export default {
  htmlEncode,
  htmlDecode,
  stripHtml,
  sanitizeInput,
  sanitizeHtml,
  sanitizeProfile,
  sanitizeGameInput,
  sanitizeUrl,
  getCSPHeaders
};