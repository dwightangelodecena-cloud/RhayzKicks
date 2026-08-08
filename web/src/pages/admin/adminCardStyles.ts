// Shared inline <style> block for admin CMS cards/tables/buttons, imported as a
// template string so each admin tab doesn't repeat the same CSS.
export const adminCardStyles = `
  .rk-admin-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-elevated);
  }
  .rk-admin-card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 1.125rem;
    margin: 0;
  }
  .rk-admin-card-title svg {
    color: var(--accent-red);
    flex-shrink: 0;
  }
  .rk-peso {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    font-weight: 700;
    margin-right: 0.06em;
  }
  .rk-admin-card-desc {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin: 0.3rem 0 1.25rem;
  }
  .rk-admin-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .rk-admin-card-head .rk-admin-card-desc {
    margin: 0.3rem 0 0;
  }
  .rk-admin-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg-secondary);
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
    margin-bottom: 0.625rem;
    transition: background-color 0.15s ease;
  }
  .rk-admin-row span {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text);
  }
  .rk-admin-row input[type='text'] {
    flex: 1;
    background: var(--bg-secondary);
    border: none;
    font-size: 0.875rem;
    color: var(--text);
  }
  .rk-admin-icon-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 0.5rem;
    display: flex;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .rk-admin-icon-btn:hover {
    color: var(--text);
    background: var(--bg-secondary);
  }
  .rk-admin-add-row {
    display: flex;
    gap: 0.625rem;
  }
  .rk-admin-add-input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.75rem 1.125rem;
    background: var(--bg);
    color: var(--text);
    font-size: 0.875rem;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .rk-admin-add-input:focus,
  .rk-admin-row input:focus {
    outline: none;
    border-color: var(--accent-red);
    box-shadow: 0 0 0 3px rgba(254, 0, 0, 0.1);
  }
  .rk-admin-add-btn,
  .rk-admin-primary-btn {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1.25rem;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .rk-admin-add-btn:hover,
  .rk-admin-primary-btn:hover {
    opacity: 0.85;
  }
  .rk-admin-add-btn:active,
  .rk-admin-primary-btn:active {
    transform: scale(0.97);
  }
  .rk-admin-primary-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* -------------------------------------------------------------------- */
  /* Tables                                                                 */
  /* -------------------------------------------------------------------- */
  .rk-admin-table-count {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }
  .rk-admin-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 0.875rem;
  }
  .rk-admin-table {
    width: 100%;
    border-collapse: collapse;
  }
  .rk-admin-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .rk-admin-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.8125rem;
    color: var(--text);
    vertical-align: middle;
  }
  .rk-admin-table tbody tr {
    transition: background-color 0.12s ease;
  }
  .rk-admin-table tbody tr:hover {
    background: var(--bg-secondary);
  }
  .rk-admin-table tbody tr:last-child td {
    border-bottom: none;
  }
  .rk-admin-tag {
    background: var(--text);
    color: var(--bg);
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
  }
  .rk-admin-table-actions {
    display: flex;
    gap: 0.375rem;
  }
  .rk-admin-table input,
  .rk-admin-table select {
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    background: var(--bg);
    color: var(--text);
    width: 100%;
  }

  /* -------------------------------------------------------------------- */
  /* Status badges — good/warning/critical steps, never color-alone        */
  /* -------------------------------------------------------------------- */
  .rk-admin-badge {
    display: inline-flex;
    align-items: center;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .rk-admin-badge-ok {
    background: rgba(12, 163, 12, 0.12);
    color: #0ca30c;
  }
  .rk-admin-badge-warn {
    background: rgba(250, 178, 25, 0.16);
    color: #8a5a00;
  }
  .rk-admin-badge-off {
    background: var(--bg-secondary);
    color: var(--text-faint);
  }

  /* -------------------------------------------------------------------- */
  /* Empty states                                                           */
  /* -------------------------------------------------------------------- */
  .rk-admin-empty {
    font-size: 0.8125rem;
    color: var(--text-muted);
    padding: 1.75rem 1rem;
    text-align: center;
    border: 1px dashed var(--border);
    border-radius: 0.75rem;
  }

  /* -------------------------------------------------------------------- */
  /* Form grids used by add/edit panels                                    */
  /* -------------------------------------------------------------------- */
  .rk-admin-form-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.875rem;
    padding: 1rem;
    margin-bottom: 1.25rem;
  }
  .rk-admin-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.625rem;
  }
  .rk-admin-form-grid input,
  .rk-admin-form-grid select,
  .rk-admin-form-grid textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
    background: var(--bg);
    color: var(--text);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .rk-admin-form-grid input:focus,
  .rk-admin-form-grid select:focus,
  .rk-admin-form-grid textarea:focus {
    outline: none;
    border-color: var(--accent-red);
    box-shadow: 0 0 0 3px rgba(254, 0, 0, 0.1);
  }
  .rk-admin-form-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    margin-top: 0.125rem;
  }
  .rk-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  .rk-field-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }
  .rk-field-full {
    grid-column: 1 / -1;
  }
  .rk-field-upload-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }
  .rk-field-thumb {
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    object-fit: cover;
    flex-shrink: 0;
    background: var(--placeholder-bg);
  }
`
