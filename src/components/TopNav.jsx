import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopNav() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false); // Cleanly closes the drawer after navigating
  };

  return (
    <nav className="topnav navbar-responsive-container">


      {/* Corporate Identity Vector Brand Engine */}
      <Link to="/" className="logo-wrap" onClick={() => setIsOpen(false)}>
        <div className="logo-img-box">
          <img
            src="/Logo.jpg"
            alt="NTCS Logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="logo-divider"></div>
      </Link>

      {/* THREE LINES HAMBURGER TRIGGER COMPONENT */}
      <button
        type="button"
        className={`hamburger-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
      >
        <div className="hamburger-line line-1"></div>
        <div className="hamburger-line line-2"></div>
        <div className="hamburger-line line-3"></div>
      </button>

      {/* Interactive Navigation Action Group Controls */}
      <div className={`nav-actions-group ${isOpen ? 'menu-open' : ''}`}>
        <button className="nav-btn outline" onClick={() => handleNavigation('/')}>
          🔍 Verify Certificate
        </button>

        <button className="nav-btn outline" onClick={() => handleNavigation('/status')}>
          📊 Check Status
        </button>

        {/* RESTORED AND SYNCED REQUEST NAVIGATION ELEMENT */}
        <button className="nav-btn outline" onClick={() => handleNavigation('/request')}>
          🎓 Request Token
        </button>
      </div>
    </nav>
  );
}