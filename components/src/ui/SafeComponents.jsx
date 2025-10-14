/**
 * XSS-Safe Comment Component
 * Demonstrates proper sanitization before rendering user content
 */

import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Safe HTML sanitization utility
 */
const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Safe text sanitization (strips all HTML)
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  // HTML encode special characters
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Comment Component with XSS Protection
 */
export const SafeComment = ({ 
  author, 
  content, 
  timestamp, 
  allowHtml = false 
}) => {
  // Sanitize author name (never allow HTML)
  const safeAuthor = sanitizeText(author);
  
  // Sanitize content based on allowHtml setting
  const safeContent = allowHtml 
    ? sanitizeHtml(content)
    : sanitizeText(content);

  return (
    <div className="comment" data-testid="safe-comment">
      <div className="comment-header">
        <span className="comment-author">{safeAuthor}</span>
        <span className="comment-timestamp">{timestamp}</span>
      </div>
      <div className="comment-content">
        {allowHtml ? (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: safeContent 
            }} 
          />
        ) : (
          <p>{safeContent}</p>
        )}
      </div>
    </div>
  );
};

/**
 * User Profile Component with XSS Protection
 */
export const SafeUserProfile = ({ 
  username, 
  displayName, 
  bio, 
  avatarUrl 
}) => {
  const safeUsername = sanitizeText(username);
  const safeDisplayName = sanitizeText(displayName);
  const safeBio = sanitizeHtml(bio); // Allow some HTML in bio
  
  // Validate avatar URL
  const safeAvatarUrl = avatarUrl && avatarUrl.match(/^https?:\/\//)
    ? avatarUrl
    : '/default-avatar.png';

  return (
    <div className="user-profile" data-testid="safe-user-profile">
      <img 
        src={safeAvatarUrl} 
        alt={`${safeUsername}'s avatar`}
        onError={(e) => { e.target.src = '/default-avatar.png'; }}
      />
      <h2>{safeDisplayName || safeUsername}</h2>
      <p className="username">@{safeUsername}</p>
      {safeBio && (
        <div 
          className="bio"
          dangerouslySetInnerHTML={{ __html: safeBio }}
        />
      )}
    </div>
  );
};

/**
 * Game Chat Component with XSS Protection
 */
export const SafeGameChat = ({ messages = [] }) => {
  return (
    <div className="game-chat" data-testid="safe-game-chat">
      <div className="chat-messages">
        {messages.map((message, index) => {
          const safePlayer = sanitizeText(message.player);
          const safeMessage = sanitizeText(message.text);
          
          return (
            <div key={index} className="chat-message">
              <span className="chat-player">{safePlayer}:</span>
              <span className="chat-text">{safeMessage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Search Results Component with XSS Protection
 */
export const SafeSearchResults = ({ query, results = [] }) => {
  const safeQuery = sanitizeText(query);
  
  return (
    <div className="search-results" data-testid="safe-search-results">
      <h3>Search results for: "{safeQuery}"</h3>
      <div className="results-list">
        {results.map((result, index) => {
          const safeTitle = sanitizeText(result.title);
          const safeDescription = sanitizeText(result.description);
          
          return (
            <div key={index} className="search-result">
              <h4>{safeTitle}</h4>
              <p>{safeDescription}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default {
  SafeComment,
  SafeUserProfile,
  SafeGameChat,
  SafeSearchResults,
  sanitizeHtml,
  sanitizeText
};