// src/components/UserStatusDebug.tsx
import React, { useState } from 'react';

const UserStatusDebug: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);

  const addResult = (test: string, result: any) => {
    setTestResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  const testAPI = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/debug-user-update/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: 1 })
      });
      
      const data = await response.json();
      addResult('Debug Update Test', { 
        success: response.ok, 
        status: response.status,
        data 
      });
    } catch (error) {
      addResult('Debug Update Test', { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };

  const testAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      addResult('Auth Test', { success: true, data });
    } catch (error) {
      addResult('Auth Test', { success: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const testUserUpdate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/test-user-update/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 1 })
      });
      const data = await response.json();
      addResult('User Update Test', { success: true, data });
    } catch (error) {
      addResult('User Update Test', { success: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Debug Panel</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testAPI} style={{ marginRight: '10px' }}>Test Debug Update</button>
        <button onClick={testAuth} style={{ marginRight: '10px' }}>Test Auth</button>
        <button onClick={testUserUpdate} style={{ marginRight: '10px' }}>Test User Update</button>
        <button onClick={clearResults}>Clear Results</button>
      </div>

      <div>
        <h4>Test Results:</h4>
        {testResults.map((result, index) => (
          <div key={index} style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            backgroundColor: result.result.success ? '#d4edda' : '#f8d7da',
            border: '1px solid #c3e6cb'
          }}>
            <strong>{result.test}</strong> - {result.timestamp}
            <pre>{JSON.stringify(result.result, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserStatusDebug;
