import React from 'react';
import { Link } from 'react-router-dom';
import './style.css';

export default function DashboardIntro() {
  const features = [
    { icon: 'fa-location-crosshairs', title: 'Real-Time Tracking', desc: 'Live occupancy data updated every second via IoT sensors, ensuring 100% accuracy for drivers and operators.' },
    { icon: 'fa-qrcode', title: 'QR Check-In', desc: 'Seamless entry and exit using mobile QR codes. Eliminate paper tickets and reduce wait times at gates.' },
    { icon: 'fa-calendar-days', title: 'Reservation', desc: 'Book spots in advance with guaranteed availability. Dynamic pricing integration for peak hours.' },
    { icon: 'fa-credit-card', title: 'Automated Billing', desc: 'Frictionless payments based on exact duration. Supports Apple Pay, Google Pay, and major credit cards.' },
    { icon: 'fa-chart-simple', title: 'Analytics', desc: 'Deep insights into usage patterns and revenue optimization with customizable reporting dashboards.' },
    { icon: 'fa-cubes', title: 'Multi-Lot Management', desc: 'Control distributed facilities from a single unified dashboard with role-based access control.' }
  ];

  return (
    <div className="landing-wrapper">
      
      {/* GLOBAL NAVBAR */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">P</span> Smart Parking
        </div>
        
        {/* Đã cập nhật About Us thành Feedback */}
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#operations">Parking Map</a>
          <a href="#feedback">Feedback</a> 
          <a href="#contact">Contact</a>
        </div>
        
        <div className="nav-auth">
          <Link to="/login" className="btn-login">Login</Link>
        </div>
      </nav>

      {/* SECTION 1: HERO BANNER */}
      <header id="home" className="hero-section">
        <div className="hero-grid-container">
          <div className="hero-left-content">
            <span className="badge-tag">• Next-Gen City Infrastructure</span>
            <h1>Smart Parking for <span className="gradient-text">Modern Cities</span></h1>
            <p>Monitor, reserve and manage parking spaces in real time with AI-powered parking technology. Revolutionizing urban mobility.</p>
            <div className="hero-cta-group">
              <Link to="/login" className="btn-cta-primary">Start Now →</Link>
             
            </div>
          </div>

          <div className="hero-right-showcase">
            <div className="central-hub-card">
              <div className="hub-header">
                <div>
                  <i className="fa-solid fa-circle-nodes hub-icon"></i>
                  <strong>Central Hub</strong>
                  <span className="hub-sub">Live System Status</span>
                </div>
                <span className="status-online"><span className="dot"></span> Online</span>
              </div>
              
              <div className="hub-stats-grid">
                <div className="hub-stat-box">
                  <span className="box-label"><i className="fa-regular fa-folder"></i> Total Slots</span>
                  <h3>2,450</h3>
                  <span className="trend-up">+12%</span>
                </div>
                <div className="hub-stat-box">
                  <span className="box-label"><i className="fa-regular fa-circle-check"></i> Available</span>
                  <h3 className="text-green">342</h3>
                  <span className="trend-live">Live</span>
                </div>
                <div className="hub-stat-box">
                  <span className="box-label"><i className="fa-solid fa-chart-line"></i> Daily Revenue</span>
                  <h3>$12.4k</h3>
                  <span className="trend-up">+8.4%</span>
                </div>
                <div className="hub-stat-box">
                  <span className="box-label"><i className="fa-regular fa-clock"></i> Active Res.</span>
                  <h3>85</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="trust-stats-bar">
          <div className="trust-item"><strong>10k+</strong><span>Active Users</span></div>
          <div className="trust-item"><strong>50+</strong><span>Cities Covered</span></div>
          <div className="trust-item"><strong>1M+</strong><span>Bookings Made</span></div>
          <div className="trust-item"><strong>99.9%</strong><span>Uptime</span></div>
        </div>
      </header>

      {/* SECTION 2: INTELLIGENT INFRASTRUCTURE */}
      <section id="features" className="features-section">
        <div className="center-title">
          <h2>Intelligent Infrastructure</h2>
          <p>Powerful features to manage urban mobility and maximize facility efficiency.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-wrapper">
                <i className={`fa-solid ${f.icon}`}></i>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: LIVE OPERATIONS DIGITAL TWIN */}
      <section id="operations" className="operations-section">
        <div className="center-title">
          <h2>Live Operations</h2>
          <p>Monitor facility status in real-time with our digital twin interface.</p>
        </div>

        <div className="digital-twin-monitor">
          <div className="twin-header">
            <div className="twin-title">
              <strong>Sector 7 Layout</strong>
              <span className="live-feed-tag">• Live Feed</span>
            </div>
            <div className="twin-legend">
              <span className="leg-item"><span className="leg-dot bg-green"></span> Available</span>
              <span className="leg-item"><span className="leg-dot bg-blue"></span> Occupied</span>
              <span className="leg-item"><span className="leg-dot bg-orange"></span> Reserved</span>
              <span className="leg-item"><span className="leg-dot bg-red"></span> Maintenance</span>
            </div>
          </div>

          <div className="twin-map-container">
            <div className="wing-block">
              <span className="wing-name">NORTH WING (A-BLOCK)</span>
              <div className="slots-row">
                <div className="twin-slot state-available">
                  <span className="slot-id">A1</span>
                  <span className="slot-status-txt">Open</span>
                </div>
                <div className="twin-slot state-occupied">
                  <span className="slot-id">A2</span>
                  <i className="fa-solid fa-car car-icon"></i>
                </div>
                <div className="twin-slot state-occupied">
                  <span className="slot-id">A3</span>
                  <i className="fa-solid fa-car car-icon"></i>
                </div>
                <div className="twin-slot state-reserved">
                  <span className="slot-id">A4</span>
                  <span className="slot-status-txt">Reserved</span>
                </div>
              </div>
            </div>

            <div className="road-divider"></div>

            <div className="wing-block">
              <span className="wing-name">SOUTH WING (B-BLOCK)</span>
              <div className="slots-row">
                <div className="twin-slot state-available">
                  <span className="slot-id">B1</span>
                  <span className="slot-status-txt">Open</span>
                </div>
                <div className="twin-slot state-occupied">
                  <span className="slot-id">B2</span>
                  <i className="fa-solid fa-car car-icon"></i>
                </div>
                <div className="twin-slot state-maintenance">
                  <span className="slot-id">B3</span>
                  <i className="fa-solid fa-wrench maintenance-icon"></i>
                </div>
                <div className="twin-slot state-available">
                  <span className="slot-id">B4</span>
                  <span className="slot-status-txt">Open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TESTIMONIALS & REVIEWS (Gắn ID #feedback tại đây) */}
      <section id="feedback" className="reviews-section">
        <div className="reviews-layout-grid">
          <div className="reviews-left-text">
            <h2>Built for scale, designed for simplicity.</h2>
            <p>Join hundreds of facility managers who have transformed their parking operations, increased revenue, and delighted their customers.</p>
            
            <div className="mini-feature-row">
              <div className="mini-icon"><i className="fa-solid fa-chart-line"></i></div>
              <div>
                <h4>Increase Revenue by 30%</h4>
                <p>Dynamic pricing algorithms ensure maximum yield during peak hours.</p>
              </div>
            </div>

            <div className="mini-feature-row">
              <div className="mini-icon"><i className="fa-solid fa-bolt"></i></div>
              <div>
                <h4>Deploy in Days, Not Months</h4>
                <p>Our plug-and-play IoT sensors require zero complex wiring.</p>
              </div>
            </div>
          </div>

          <div className="reviews-right-cards">
            <div className="review-card">
              <div className="stars">★★★★★</div>
              <p>"Smart Parking completely revolutionized how we manage our downtown garages. The real-time visibility alone paid for the system in month one."</p>
              <div className="reviewer-profile">
                <div className="avatar-circle">JD</div>
                <div>
                  <strong>James Davies</strong>
                  <span>Operations Director, Metro Park</span>
                </div>
              </div>
            </div>

            <div className="review-card">
              <div className="stars">★★★★★</div>
              <p>"The automated billing and reservation system reduced our customer support tickets by 80%. It just works perfectly."</p>
              <div className="reviewer-profile">
                <div className="avatar-circle">SC</div>
                <div>
                  <strong>Sarah Chen</strong>
                  <span>Facility Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GLOBAL FOOTER BLOCK */}
      <footer id="contact" className="landing-footer">
        <div className="footer-main-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span>P</span> Smart Parking System
            </div>
            <p>
              A modern parking management platform helping drivers find parking spaces and administrators manage parking lots.
            </p>
            <div className="footer-social-circles">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="circle" title="GitHub">
                <i className="fa-brands fa-github"></i>
              </a>
              <a href="mailto:contact@example.com" className="circle" title="Email">
                <i className="fa-regular fa-envelope"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="circle" title="Facebook">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
            </div>
          </div>
          
          <div className="footer-links-column">
            <h4>Navigation</h4>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#operations">Parking Map</a>
            <a href="#feedback">Feedback</a>
          </div>

          <div className="footer-links-column">
            <h4>System</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/reservations">Reservations</Link>
            <Link to="/reports">Reports</Link>
            <Link to="/pricing-policies">Pricing</Link>
          </div>

          <div className="footer-links-column">
            <h4>Project</h4>
            <a href="#about-us">About Us</a>
            <a href="#team">Team Members</a>
            <a href="#documentation">Documentation</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© 2026 Smart Parking System. Developed by SWP Team 3.</span>
        </div>
      </footer>

    </div>
  );
}