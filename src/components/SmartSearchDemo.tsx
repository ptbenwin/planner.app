"use client";

import SmartSearch from './SmartSearch';

export default function SmartSearchDemo() {
  return (
    <div style={{ 
      padding: '20px', 
      background: 'var(--background)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
      <div>
        <h2>SmartSearch Mobile Demo</h2>
        <p>Test the search component in different configurations:</p>
      </div>

      <div style={{ 
        background: 'var(--surface)', 
        padding: '20px', 
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        <h3>Initially Collapsed (Mobile should expand to full width when active)</h3>
        <SmartSearch
          initiallyCollapsed={true}
          placeholder="Search with collapsed start..."
          onResultSelect={(result) => console.log('Collapsed search result:', result)}
        />
      </div>

      <div style={{ 
        background: 'var(--surface)', 
        padding: '20px', 
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        <h3>Initially Expanded (Mobile should stay full width)</h3>
        <SmartSearch
          initiallyCollapsed={false}
          placeholder="Search with expanded start - mobile full width..."
          onResultSelect={(result) => console.log('Expanded search result:', result)}
        />
      </div>

      <div style={{ 
        background: 'var(--surface)', 
        padding: '20px', 
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        <h3>In Header-like Container</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'var(--header-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <button style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            Menu
          </button>
          <SmartSearch
            initiallyCollapsed={false}
            placeholder="Header search - mobile full width..."
            onResultSelect={(result) => console.log('Header search result:', result)}
          />
          <button style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            Profile
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--surface-alt)',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        color: 'var(--text-secondary)'
      }}>
        <strong>Mobile Testing Instructions:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Open browser developer tools and toggle device simulation</li>
          <li>Set viewport to mobile size (375px or 768px width)</li>
          <li>Test search input expansion and dropdown positioning</li>
          <li>Verify touch targets are at least 48px in height</li>
          <li>Check that dropdowns don&apos;t extend beyond viewport edges</li>
        </ul>
      </div>
    </div>
  );
}