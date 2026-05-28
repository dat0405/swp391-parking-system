import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';

function Header() {
  return (
    <header className="top-header">
      <div className="search-bar">
        <Search size={16} />
        <input type="text" placeholder="Search plates, users, or floor ID..." />
      </div>
      <div className="header-actions">
        <button className="icon-btn"><Bell size={18} /><span className="badge-dot"></span></button>
        <button className="icon-btn"><Settings size={18} /></button>
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">Phung Thanh DO</span>
            <span className="user-role">Admin</span>
          </div>
          <img className="user-avatar" src="https://danviet-24h.ex-cdn.com/files/upload/2-2021/images/2021-06-26/42725836-adf9-4fc7-8764-9f671109ee3a-1624678195-502-width600height400.jpeg" alt="Avatar" />
        </div>
      </div>
    </header>
  );
}

export default Header;