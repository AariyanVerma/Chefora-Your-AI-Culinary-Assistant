'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface TestResults {
  message: string;
  results: {
    groq: {
      configured: boolean;
      keyLength: number;
      tested: boolean;
      working: boolean;
      error: string | null;
    };
    gemini: {
      configured: boolean;
      keyLength: number;
      tested: boolean;
      working: boolean;
      error: string | null;
      modelUsed: string | null;
    };
  };
  instructions: string | null;
}

export default function TestAIPage() {
  const [results, setResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/test-ai');
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          setError('Failed to fetch test results');
        }
      } catch (err: any) {
        setError(err?.message || 'Error fetching test results');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-muted">Loading AI test results...</div>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="card-wrapper" style={{ maxWidth: '600px', width: '90%' }}>
          <div className="card-background"></div>
          <div className="glass card card-mount">
            <div className="cardBody" style={{ padding: '2rem' }}>
              <h2 className="cardTitle" style={{ marginBottom: '1rem' }}>Error</h2>
              <p className="text-muted">{error || 'Failed to load test results'}</p>
              <Link href="/dashboard" className="dashboard-card-button" style={{ marginTop: '1.5rem' }}>
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="bg-base" aria-hidden />
      <div className="bg-anim" aria-hidden>
        <span
          className="bubble b-pink"
          style={
            { "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any
          }
        />
        <span
          className="bubble b-blue"
          style={
            { "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any
          }
        />
        <span
          className="bubble b-green"
          style={
            { "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any
          }
        />
        <span
          className="bubble b-neon"
          style={
            { "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any
          }
        />
        <span
          className="bubble b-purple"
          style={
            { "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any
          }
        />
        <span
          className="bubble b-amber"
          style={
            { "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any
          }
        />
      </div>

      <div className="container" style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: '1200px', margin: '0 auto' }}>
        {}
        <div style={{ marginBottom: '2rem' }}>
          <Link 
            href="/dashboard" 
            className="dashboard-card-button" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '1rem',
              textDecoration: 'none'
            }}
          >
            ← Back to Dashboard
          </Link>
          <h1 className="cardTitle" style={{ fontSize: 'var(--fs-xl)', marginBottom: '0.5rem' }}>
            AI API Test Results
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--fs-md)' }}>
            Verify that your AI model configurations are working correctly
          </p>
        </div>

        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {}
          <div className="card-wrapper dashboard-stat-card">
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">⚡</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>Groq API</h3>
                </div>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Status:</span>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: 'var(--fs-sm)',
                      fontWeight: '500',
                      backgroundColor: results.results.groq.working 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : 'rgba(239, 68, 68, 0.2)',
                      color: results.results.groq.working 
                        ? '#4ade80' 
                        : '#f87171',
                      border: `1px solid ${results.results.groq.working ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      {results.results.groq.working ? '✓ Working' : '✗ Failed'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Configured:</span>
                    <span>{results.results.groq.configured ? 'Yes' : 'No'}</span>
                  </div>

                  {results.results.groq.configured && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Key Length:</span>
                        <span>{results.results.groq.keyLength} characters</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Tested:</span>
                        <span>{results.results.groq.tested ? 'Yes' : 'No'}</span>
                      </div>
                    </>
                  )}

                  {results.results.groq.error && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                      <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>Error:</span>
                      <p style={{ 
                        margin: '0.25rem 0 0 0', 
                        fontSize: 'var(--fs-sm)', 
                        color: '#f87171',
                        wordBreak: 'break-word'
                      }}>
                        {results.results.groq.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="card-wrapper dashboard-stat-card">
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">🤖</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>Gemini API</h3>
                </div>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted">Status:</span>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: 'var(--fs-sm)',
                      fontWeight: '500',
                      backgroundColor: results.results.gemini.working 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : 'rgba(239, 68, 68, 0.2)',
                      color: results.results.gemini.working 
                        ? '#4ade80' 
                        : '#f87171',
                      border: `1px solid ${results.results.gemini.working ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      {results.results.gemini.working ? '✓ Working' : '✗ Failed'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Configured:</span>
                    <span>{results.results.gemini.configured ? 'Yes' : 'No'}</span>
                  </div>

                  {results.results.gemini.configured && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Key Length:</span>
                        <span>{results.results.gemini.keyLength} characters</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Tested:</span>
                        <span>{results.results.gemini.tested ? 'Yes' : 'No'}</span>
                      </div>

                      {results.results.gemini.modelUsed && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="text-muted">Model Used:</span>
                          <span style={{ 
                            fontSize: 'var(--fs-sm)', 
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(103, 232, 249, 0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(103, 232, 249, 0.2)'
                          }}>
                            {results.results.gemini.modelUsed}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {results.results.gemini.error && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.75rem', 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                      <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>Error:</span>
                      <p style={{ 
                        margin: '0.25rem 0 0 0', 
                        fontSize: 'var(--fs-sm)', 
                        color: '#f87171',
                        wordBreak: 'break-word'
                      }}>
                        {results.results.gemini.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {}
        {results.instructions && (
          <div className="card-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">ℹ️</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>Setup Instructions</h3>
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>
                  {results.instructions}
                </p>
              </div>
            </div>
          </div>
        )}

        {}
        <div className="card-wrapper" style={{ maxWidth: '800px', margin: '2rem auto 0' }}>
          <div className="card-background"></div>
          <div className="glass card card-mount">
            <div className="cardBody">
              <h3 className="cardTitle" style={{ marginBottom: '1rem' }}>Test Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: results.results.groq.working && results.results.gemini.working
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${results.results.groq.working && results.results.gemini.working 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  <span>Both APIs Working:</span>
                  <span style={{ 
                    fontWeight: '600',
                    color: results.results.groq.working && results.results.gemini.working
                      ? '#4ade80'
                      : '#f87171'
                  }}>
                    {results.results.groq.working && results.results.gemini.working ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                
                {results.results.groq.working && results.results.gemini.working && (
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    fontSize: 'var(--fs-sm)', 
                    color: 'var(--muted)',
                    textAlign: 'center'
                  }}>
                    ✅ Your AI configuration is ready! Recipe enhancements will use these models.
                  </p>
                )}

                {(!results.results.groq.working || !results.results.gemini.working) && (
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    fontSize: 'var(--fs-sm)', 
                    color: '#f87171',
                    textAlign: 'center'
                  }}>
                    ⚠️ Some AI models are not working. Recipe enhancements may be limited.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
