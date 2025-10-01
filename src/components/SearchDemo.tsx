"use client";

import SmartSearch, { SearchResult } from './SmartSearch';

export default function SearchDemo() {
  const handleResultSelect = (result: SearchResult) => {
    console.log('Selected result:', result);
    // Handle the selected search result
  };

  return (
    <div className="search-demo">
      <h3>Collapsible Smart Search Demo</h3>
      <div style={{ maxWidth: '400px', margin: '20px 0' }}>
        <SmartSearch
          onResultSelect={handleResultSelect}
          placeholder="Search documents with AI..."
          className="demo-search"
        />
      </div>
      <p>
        <strong>How it works:</strong>
      </p>
      <ul>
        <li>Initially shows only a search icon</li>
        <li>Click the icon to expand the search input</li>
        <li>Type to search documents</li>
        <li>Click outside to collapse (if no search query)</li>
        <li>Press Escape to collapse</li>
      </ul>
    </div>
  );
}