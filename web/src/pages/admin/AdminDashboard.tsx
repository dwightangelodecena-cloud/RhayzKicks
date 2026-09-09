import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAdmin } from '../../context/AdminContext'
import { supabase } from '../../supabase'
import AdminOverview from './AdminOverview'
import AdminCMS from './AdminCMS'
import AdminVendors from './AdminVendors'
import AdminStaffHours from './AdminStaffHours'
import AdminSalesPOS from './AdminSalesPOS'
import AdminInventory from './AdminInventory'
import AdminStaff from './AdminStaff'
import AdminLoyalty from './AdminLoyalty'
import StaffMyHours from './StaffMyHours'
import { IconBox, IconClock, IconLayers, IconLogout, IconMedal, IconOverview, IconStore, IconTruck, IconUsers, IconWallet } from './adminIcons'
import type { StaffRole } from '../../types/database.types'

const tabs = [
  { label: 'Overview', icon: IconOverview, blurb: 'Store performance at a glance', roles: ['admin'] },
  { label: 'Sales', icon: IconWallet, blurb: 'Ring up a sale', roles: ['admin', 'staff'] },
  { label: 'Inventory', icon: IconBox, blurb: 'Stock on hand & restocks', roles: ['admin', 'staff'] },
  { label: 'Content', icon: IconLayers, blurb: 'Banners, collections, categories & products — everything on the storefront', roles: ['admin'] },
  { label: 'Vendors', icon: IconTruck, blurb: 'Suppliers & purchase orders', roles: ['admin'] },
  { label: 'Staff', icon: IconUsers, blurb: 'Staff roster & roles', roles: ['admin'] },
  { label: 'Staff Hours', icon: IconClock, blurb: 'Shift log & hours worked', roles: ['admin'] },
  { label: 'My Hours', icon: IconClock, blurb: 'Clock in / clock out', roles: ['staff'] },
  { label: 'Loyalty', icon: IconMedal, blurb: 'Redemption options & issued vouchers', roles: ['admin'] },
] as const

type TabLabel = (typeof tabs)[number]['label']

export default function AdminDashboard() {
  const { logout, role } = useAdmin()
  const visibleTabs = tabs.filter((t) => (t.roles as readonly StaffRole[]).includes(role ?? 'staff'))
  const [tab, setTab] = useState<TabLabel>(visibleTabs[0]?.label ?? 'Sales')
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? null))
  }, [])

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.label === tab)) {
      setTab(visibleTabs[0].label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const activeTab = visibleTabs.find((t) => t.label === tab) ?? visibleTabs[0]
  const initials = (adminEmail ?? 'A').slice(0, 1).toUpperCase()

  return (
    <div className="rk-admin-shell">
      <style>{`
        .rk-admin-shell {
          min-height: 100vh;
          display: flex;
          background: var(--bg-secondary);
        }

        /* ---------------------------------------------------------------- */
        /* Sidebar                                                          */
        /* ---------------------------------------------------------------- */
        .rk-admin-sidebar {
          width: 15.5rem;
          flex-shrink: 0;
          background: #0b0b0b;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .rk-admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 1.375rem 1.25rem;
        }
        .rk-admin-wordmark {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          font-size: 1.125rem;
          line-height: 1;
        }
        .rk-admin-wordmark span {
          color: var(--accent-red);
        }
        .rk-admin-brand-sub {
          font-size: 9px;
          letter-spacing: 0.16em;
          color: rgba(255, 255, 255, 0.38);
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 0.2rem;
        }
        .rk-admin-nav {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .rk-admin-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.56);
          padding: 0.625rem 0.75rem;
          border-radius: 0.625rem;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
        }
        .rk-admin-nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%) scaleY(0);
          width: 3px;
          height: 60%;
          border-radius: 3px;
          background: var(--accent-red);
          transition: transform var(--duration-base) var(--ease-out);
        }
        .rk-admin-nav-item svg {
          flex-shrink: 0;
          opacity: 0.85;
        }
        .rk-admin-nav-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          transform: translateX(2px);
        }
        .rk-admin-nav-item-active {
          background: rgba(254, 0, 0, 0.14);
          color: #fff;
        }
        .rk-admin-nav-item-active::before {
          transform: translateY(-50%) scaleY(1);
        }
        .rk-admin-nav-item-active svg {
          color: var(--accent-red);
          opacity: 1;
        }
        .rk-admin-sidebar-footer {
          padding: 0.875rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .rk-admin-profile {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.5rem;
          margin-bottom: 0.25rem;
        }
        .rk-admin-profile-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-red), #7a0000);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .rk-admin-profile-text {
          min-width: 0;
        }
        .rk-admin-profile-email {
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rk-admin-profile-role {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.4);
        }
        .rk-admin-sidebar-action {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.62);
          padding: 0.5rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
        }
        .rk-admin-sidebar-action:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .rk-admin-sidebar-action-danger:hover {
          background: rgba(254, 0, 0, 0.12);
          color: #ff5c5c;
        }

        /* ---------------------------------------------------------------- */
        /* Main column                                                      */
        /* ---------------------------------------------------------------- */
        .rk-admin-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .rk-admin-header {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 1.125rem 2rem;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .rk-admin-header-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          font-size: 1.375rem;
          color: var(--text);
          margin: 0;
        }
        .rk-admin-header-blurb {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
        }
        .rk-admin-content {
          padding: 1.75rem 2rem 3rem;
          max-width: 100rem;
          width: 100%;
        }

        /* ---------------------------------------------------------------- */
        /* Mobile fallback — sidebar becomes a horizontal top nav            */
        /* ---------------------------------------------------------------- */
        @media (max-width: 61rem) {
          .rk-admin-shell {
            flex-direction: column;
          }
          .rk-admin-sidebar {
            width: 100%;
            height: auto;
            position: static;
            flex-direction: row;
            align-items: center;
            padding-right: 0.75rem;
          }
          .rk-admin-sidebar-brand {
            padding: 0.75rem 1rem;
          }
          .rk-admin-nav {
            flex-direction: row;
            overflow-x: auto;
            padding: 0.5rem;
          }
          .rk-admin-nav-item span.rk-admin-nav-blurb {
            display: none;
          }
          .rk-admin-nav-item {
            white-space: nowrap;
          }
          .rk-admin-sidebar-footer {
            border-top: none;
            flex-direction: row;
            padding: 0.5rem;
          }
          .rk-admin-profile {
            display: none;
          }
          .rk-admin-content {
            padding: 1.25rem 1rem 2.5rem;
          }
          .rk-admin-header {
            padding: 1rem 1rem;
          }
        }
      `}</style>

      <aside className="rk-admin-sidebar">
        <div className="rk-admin-sidebar-brand">
          <Logo size={32} />
          <div>
            <div className="rk-admin-wordmark">RHAYZ<span>.</span></div>
            <div className="rk-admin-brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="rk-admin-nav">
          {visibleTabs.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.label
            return (
              <button
                key={t.label}
                className={`rk-admin-nav-item ${isActive ? 'rk-admin-nav-item-active' : ''}`}
                onClick={() => setTab(t.label)}
              >
                <Icon />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="rk-admin-sidebar-footer">
          <div className="rk-admin-profile">
            <div className="rk-admin-profile-avatar">{initials}</div>
            <div className="rk-admin-profile-text">
              <div className="rk-admin-profile-email">{adminEmail ?? 'Loading…'}</div>
              <div className="rk-admin-profile-role">{role === 'admin' ? 'Admin' : 'Staff'}</div>
            </div>
          </div>
          <button className="rk-admin-sidebar-action" onClick={() => navigate('/')}>
            <IconStore /> View Store
          </button>
          <button
            className="rk-admin-sidebar-action rk-admin-sidebar-action-danger"
            onClick={() => {
              logout()
              navigate('/admin')
            }}
          >
            <IconLogout /> Log Out
          </button>
        </div>
      </aside>

      <div className="rk-admin-main">
        <header className="rk-admin-header">
          <h1 className="rk-admin-header-title">{activeTab?.label}</h1>
          <div className="rk-admin-header-blurb">{activeTab?.blurb}</div>
        </header>
        <div className="rk-admin-content rk-animate-fade-in" key={tab}>
          {tab === 'Overview' && <AdminOverview />}
          {tab === 'Sales' && <AdminSalesPOS />}
          {tab === 'Inventory' && <AdminInventory />}
          {tab === 'Content' && <AdminCMS />}
          {tab === 'Vendors' && <AdminVendors />}
          {tab === 'Staff' && <AdminStaff />}
          {tab === 'Staff Hours' && <AdminStaffHours />}
          {tab === 'My Hours' && <StaffMyHours />}
          {tab === 'Loyalty' && <AdminLoyalty />}
        </div>
      </div>
    </div>
  )
}
