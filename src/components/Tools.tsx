"use client";

export default function Tools() {
  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Productivity toolkit</h3>
            <p className="panel__description">Streamline repetitive tasks across the company with curated utilities.</p>
          </div>
        </div>

        <div className="grid grid--two">
          {[
            {
              title: 'Bulk uploader',
              description: 'Drag multiple procurement documents, invoices, and HR records for batch ingestion into Firebase Storage.',
              status: 'Available',
            },
            {
              title: 'Automated summaries',
              description: 'Generate executive-ready summaries from project charters and meeting notes using Gemini.',
              status: 'Beta',
            },
            {
              title: 'Smart reminders',
              description: 'Schedule renewal reminders and follow-ups via push notifications for each department.',
              status: 'Available',
            },
            {
              title: 'Template library',
              description: 'Centralize SOPs and company forms with approval workflows and audit logging.',
              status: 'Coming soon',
            },
          ].map((tool) => (
            <div key={tool.title} className="settings-card">
              <h4 style={{ margin: 0 }}>{tool.title}</h4>
              <p className="section-description" style={{ margin: 0 }}>{tool.description}</p>
              <span className={`status-pill ${tool.status === 'Available' ? 'success' : tool.status === 'Beta' ? 'warning' : ''}`}>
                {tool.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}