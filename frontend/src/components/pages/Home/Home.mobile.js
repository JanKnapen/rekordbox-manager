import React from 'react';
import HeaderMobile from '../../layout/Header.mobile';

// Minimal mobile home view using the mobile header. We'll implement
// the rest of the page layout later.
const HomeMobile = () => {
  return (
    <div className="home mobile-view">
      <HeaderMobile showHome={false} showPlaylistManager={true} />
      <main style={{ padding: '1rem' }}>
        <p>Mobile view for Home is under construction.</p>
      </main>
    </div>
  );
};

export default HomeMobile;
