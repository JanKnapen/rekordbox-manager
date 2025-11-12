import React from 'react';
import LoginDesktop from './Login.desktop';

// For now mobile uses the desktop implementation. Eventually this file can
// render a simplified mobile-specific layout.
const LoginMobile = (props) => {
  return <LoginDesktop {...props} />;
};

export default LoginMobile;
