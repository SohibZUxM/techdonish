import React, { Suspense, lazy } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import PortalLogin from "./PortalLogin";

const StudentPage = lazy(() => import("./StudentPage"));
const TeacherPage = lazy(() => import("./TeacherPage"));
const ParentPage = lazy(() => import("./ParentPage"));
const AdminPage = lazy(() => import("./AdminPage"));
const AdminRoute = lazy(() => import("./AdminRoute"));
const PendingApproval = lazy(() => import("./PendingApproval"));

function RouteLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fafc",
        color: "#475569",
      }}
    >
      Loading your portal...
    </div>
  );
}


function Home() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* ---------- HEADER ---------- */}
      <header className="header">
        <div className="container nav">
          <div className="brand">
            <div className="brand-icon">
              {/* simple mortarboard icon */}
              <span className="brand-icon-cap">🎓</span>
            </div>
            <div className="brand-text">
              <div className="brand-title">Hamsafar</div>
              <div className="brand-subtitle">Learning Excellence</div>
            </div>
          </div>

          <nav className="nav-links">
            <a href="#" className="nav-link">
              Home
            </a>
            <a href="#" className="nav-link">
              About
            </a>
            <a href="#" className="nav-link">
              Programs
            </a> 
            <a href="#" className="nav-link">
              Contact
            </a>
          </nav>

          <button className="btn btn-primary nav-cta" onClick={() => {
            const el = document.getElementById("access-portal");
            el?.scrollIntoView({behavior: "smooth"});
          }}>Get Started</button>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="hero-overlay" />
          <div className="container hero-inner">
            <div className="hero-left">
              <h1 className="hero-title">
                Empowering <span className="accent">Education</span> for Tomorrow
              </h1>
              <p className="hero-subtitle">
                Connect students, teachers, and parents in one comprehensive learning
                platform. Access grades, resources, and stay connected with your
                educational journey.
              </p>
              <div className="hero-actions">
                <button className="btn btn-accent">Explore Programs</button>
                <button className="btn btn-outline">Learn More</button>
              </div>
            </div>

            <div className="hero-right">
              <div className="hero-image-card">
                <img
                  src="https://images.pexels.com/photos/1181395/pexels-photo-1181395.jpeg?auto=compress&cs=tinysrgb&w=1600"
                  alt="Classroom"
                  className="hero-image"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- ACCESS PORTAL ---------- */}
        <section id="access-portal" className="section section-portal">
          <div className="container">
            <div className="section-heading">
              <h2>Access Your Portal</h2>
              <p>
                Choose your role to access personalized features and resources tailored
                to your educational needs.
              </p>
            </div>

            <div className="portal-grid">
              {/* Students */}
              <div className="portal-card portal-student">
                <div className="portal-icon-wrapper">
                  <div className="portal-icon-circle portal-icon-student">🎓</div>
                </div>
                <h3>Students</h3>
                <p className="portal-text">
                  Access your grades, assignments, resources, and stay updated with
                  announcements.
                </p>
                <ul className="portal-list">
                  <li>View Grades &amp; Progress</li>
                  <li>Access Learning Resources</li>
                  <li>Track Assignments</li>
                </ul>
                <button
                  className="btn btn-blue portal-btn"
                  onClick={() => navigate("/portal/student")}
                >
                  Student Login
                </button>
              </div>

              {/* Teachers */}
              <div className="portal-card portal-teacher">
                <div className="portal-icon-wrapper">
                  <div className="portal-icon-circle portal-icon-teacher">👩‍🏫</div>
                </div>
                <h3>Teachers</h3>
                <p className="portal-text">
                  Manage classes, upload resources, grade assignments, and communicate
                  with students.
                </p>
                <ul className="portal-list">
                  <li>Upload Grades &amp; Resources</li>
                  <li>Create Exams</li>
                  <li>Student Communication</li>
                </ul>
                <button
                  className="btn btn-green portal-btn"
                  onClick={() => navigate("/portal/teacher")}
                >
                  Teacher Login
                </button>
              </div>

              {/* Parents */}
              <div className="portal-card portal-parent">
                <div className="portal-icon-wrapper">
                  <div className="portal-icon-circle portal-icon-parent">
                    👨‍👩‍👧
                  </div>
                </div>
                <h3>Parents</h3>
                <p className="portal-text">
                  Monitor your child's progress, view grades, and stay connected with
                  teachers.
                </p>
                <ul className="portal-list">
                  <li>Monitor Child&apos;s Progress</li>
                  <li>View Grades &amp; Reports</li>
                  <li>Teacher Communication</li>
                </ul>
                <button
                  className="btn btn-purple portal-btn"
                  onClick={() => navigate("/portal/parent")}
                >
                  Parent Login
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHY CHOOSE ---------- */}
        <section className="section section-why">
          <div className="container">
            <div className="section-heading">
              <h2>Why Choose Hamsafar?</h2>
              <p>
                Our comprehensive platform brings together modern technology and
                educational excellence.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon feature-icon-blue">☁️</div>
                <h3>Cloud-Based</h3>
                <p>
                  Access your data anywhere, anytime with our secure cloud platform.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon feature-icon-green">📱</div>
                <h3>Mobile Ready</h3>
                <p>Responsive design that works perfectly on all devices.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon feature-icon-purple">🛡️</div>
                <h3>Secure</h3>
                <p>
                  Enterprise-grade security to protect sensitive educational data.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon feature-icon-orange">🎧</div>
                <h3>24/7 Support</h3>
                <p>
                  Round-the-clock technical support for uninterrupted learning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="section-cta">
          <div className="container cta-inner">
            <h2>Ready to Transform Education?</h2>
            <p>
              Join thousands of students, teachers, and parents who trust Hamsafar for
              their educational journey.
            </p>
            <div className="cta-actions">
              <button className="btn btn-accent cta-btn-main">
                Start Free Trial
              </button>
              <button className="btn btn-outline cta-btn-secondary">
                Schedule Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <div className="brand-icon footer-brand-icon">
                <span className="brand-icon-cap">🎓</span>
              </div>
              <div className="brand-text">
                <div className="brand-title footer-brand-title">Hamsafar</div>
                <div className="brand-subtitle footer-brand-subtitle">
                  Learning Excellence
                </div>
              </div>
            </div>
            <p className="footer-description">
              Empowering education through innovative technology and comprehensive
              learning management solutions.
            </p>
            <div className="footer-socials">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="footer-column">
            <h4>Quick Links</h4>
            <a href="#">About Us</a>
            <a href="#">Programs</a>
            <a href="#">Admissions</a>
            <a href="#">Contact</a>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">System Status</a>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 Hamsafar. All rights reserved.
        </div>

        <button className="help-badge">❓ Help</button>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* home page */}
          <Route path="/" element={<Home />} />
          {/* portal login page */}
          <Route path="/portal/:role" element={<PortalLogin />} />
          {/* After login destinations */}
          <Route path="/student" element={<StudentPage />} />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="/parent" element={<ParentPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route path="/pending" element={<PendingApproval />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
