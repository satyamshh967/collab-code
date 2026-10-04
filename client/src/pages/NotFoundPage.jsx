import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="fade-in" style={{ textAlign: 'center', marginTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ background: '#000', padding: '2rem', borderRadius: '8px', border: '1px solid #333', fontFamily: 'monospace' }}>
        <p style={{ color: 'var(--success)', margin: 0 }}>$ curl https://codecollab.app/page</p>
        <h1 style={{ fontSize: '3rem', color: 'var(--error)', margin: '1rem 0' }}>404 Not Found</h1>
      </div>
      <Link to="/" className="btn" style={{ marginTop: '2rem' }}>Return Home</Link>
    </div>
  );
};

export default NotFoundPage;
