/* ═══════════════════════════════════════════════════════════════
   NABTEX SOCIAL MODULE v1.0
   Modular, non-destructive | RTL | Firebase-backed
   Adds: Social Profiles, Feed, Follow, Like, Comment, Share
═══════════════════════════════════════════════════════════════ */

/* ── CSS Injection ─────────────────────────────────────────── */
(function injectCSS() {
  const css = `
.mkt-tab-social { position:relative; }
.mkt-tab-social::after {
  content:'NEW'; position:absolute; top:3px; left:4px;
  background:linear-gradient(135deg,#2d9a58,#c9871a); color:#fff;
  font-size:7px; font-weight:900; padding:1px 5px; border-radius:99px; letter-spacing:.06em;
}
#social-feed-root,#social-profile-root,#social-followers-root,#social-following-root {
  min-height:60vh; padding:0 0 100px;
}
.soc-feed-header {
  padding:18px 18px 12px; display:flex; align-items:center; justify-content:space-between;
  border-bottom:1px solid var(--line); background:var(--card);
  position:sticky; top:110px; z-index:10; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
}
.soc-feed-title { font-size:18px; font-weight:900; color:var(--ink); display:flex; align-items:center; gap:8px; }
.soc-feed-title svg { color:var(--brand); }
.soc-feed-tabs { display:flex; gap:3px; background:var(--bg2); padding:3px; border-radius:10px; }
.soc-ft {
  padding:5px 13px; border-radius:8px; font-size:12px; font-weight:800;
  color:var(--muted); cursor:pointer; border:none; background:none;
  font-family:var(--f-ui); transition:all .2s;
}
.soc-ft.active { background:var(--card); color:var(--brand); box-shadow:0 2px 8px rgba(0,0,0,.07); }
.soc-create-card {
  margin:13px 14px; background:var(--card); border-radius:var(--r3); border:1.5px solid var(--line);
  padding:13px; display:flex; gap:11px; align-items:flex-start; cursor:pointer; transition:all .2s;
}
.soc-create-card:hover { border-color:var(--brand-l); box-shadow:0 4px 12px rgba(0,0,0,.04); }
.soc-avatar {
  width:40px; height:40px; border-radius:50%; background:linear-gradient(145deg,var(--brand-l),var(--brand-d));
  flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff;
  font-weight:800; font-size:14px; overflow:hidden; cursor:pointer;
}
.soc-avatar img { width:100%; height:100%; object-fit:cover; }
.soc-avatar-sm { width:34px; height:34px; font-size:13px; }
.soc-avatar-xl { width:92px; height:92px; font-size:32px; border:3px solid #fff; box-shadow:0 8px 28px rgba(0,0,0,.1); flex-shrink:0; }
.soc-create-placeholder {
  flex:1; background:var(--bg2); border-radius:var(--rpill); padding:9px 14px; font-size:13px;
  color:var(--muted); cursor:pointer; border:1.5px solid transparent; transition:all .2s;
}
.soc-create-placeholder:hover { border-color:var(--brand-l); }
.soc-create-actions { display:flex; gap:7px; padding-top:9px; border-top:1px solid var(--line); margin-top:9px; }
.soc-create-action-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:6px 4px;
  border-radius:var(--r2); font-size:11px; font-weight:700; color:var(--muted);
  background:var(--bg2); border:1.5px solid var(--line); cursor:pointer; transition:all .2s; font-family:var(--f-ui);
}
.soc-create-action-btn:hover { color:var(--brand); border-color:var(--brand-l); }
.soc-post-card {
  margin:0 13px 13px; background:var(--card); border-radius:var(--r3); border:1px solid var(--line);
  overflow:hidden; transition:box-shadow .25s; animation:socCardIn .4s cubic-bezier(.16,1,.3,1) both;
}
@keyframes socCardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
.soc-post-card:hover { box-shadow:0 8px 28px rgba(0,0,0,.06); }
.soc-post-header { display:flex; align-items:center; gap:9px; padding:12px 13px 8px; }
.soc-post-user-info { flex:1; }
.soc-post-username { font-size:13.5px; font-weight:800; color:var(--ink); cursor:pointer; display:flex; align-items:center; gap:5px; }
.soc-post-username:hover { color:var(--brand); }
.soc-verified-badge { width:14px; height:14px; background:var(--brand); border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
.soc-verified-badge svg { width:8px; height:8px; }
.soc-post-meta { font-size:11px; color:var(--muted); margin-top:1px; }
.soc-post-more-btn {
  width:29px; height:29px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:none; border:none; cursor:pointer; color:var(--muted); transition:all .2s;
}
.soc-post-more-btn:hover { background:var(--bg2); color:var(--ink); }
.soc-post-text { padding:0 13px 10px; font-size:13.5px; line-height:1.65; color:var(--ink); white-space:pre-wrap; }
.soc-post-tag { display:inline-block; background:var(--brand-pale); color:var(--brand); font-size:11.5px; font-weight:700; padding:1px 8px; border-radius:99px; margin:0 2px; }
.soc-post-images { width:100%; overflow:hidden; }
.soc-post-images.single img { width:100%; max-height:360px; object-fit:cover; }
.soc-post-images.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:2px; }
.soc-post-images.grid2 img { width:100%; height:180px; object-fit:cover; }
.soc-post-images img { cursor:pointer; transition:filter .2s; }
.soc-post-images img:hover { filter:brightness(.9); }
.soc-post-stats {
  display:flex; align-items:center; gap:11px; padding:7px 13px;
  border-top:1px solid var(--line); border-bottom:1px solid var(--line); font-size:11.5px; color:var(--muted);
}
.soc-post-stat-item { display:flex; align-items:center; gap:3px; cursor:pointer; transition:color .15s; }
.soc-post-stat-item:hover { color:var(--brand); }
.soc-post-stat-item svg { width:12px; height:12px; }
.soc-post-actions { display:flex; padding:3px 6px; }
.soc-action-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:5px; padding:8px 4px;
  border-radius:var(--r2); font-size:12px; font-weight:700; color:var(--muted); cursor:pointer;
  background:none; border:none; font-family:var(--f-ui); transition:all .18s;
}
.soc-action-btn:hover { color:var(--brand); background:var(--brand-pale); }
.soc-action-btn.liked { color:#e74c3c; }
.soc-action-btn.liked svg { fill:#e74c3c; color:#e74c3c; }
.soc-action-btn.saved { color:var(--brand); }
.soc-action-btn svg { width:16px; height:16px; transition:transform .25s cubic-bezier(.34,1.56,.64,1); }
.soc-action-btn:hover svg { transform:scale(1.13); }
.soc-action-btn { transition:color .18s, background .18s, transform .25s cubic-bezier(.34,1.56,.64,1); }
.soc-comments-wrap { border-top:1px solid var(--line); padding:10px 13px; display:none; }
.soc-comments-wrap.open { display:block; animation:socFadeIn .2s ease both; }
@keyframes socFadeIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
.soc-comment-input-row { display:flex; gap:8px; align-items:center; margin-bottom:9px; }
.soc-comment-input {
  flex:1; background:var(--bg2); border:1.5px solid var(--line); border-radius:var(--rpill);
  padding:7px 13px; font-size:12.5px; color:var(--ink); font-family:var(--f-ui); outline:none; transition:border-color .2s;
}
.soc-comment-input:focus { border-color:var(--brand-l); }
.soc-comment-send-btn {
  width:33px; height:33px; background:var(--brand); border:none; border-radius:50%;
  display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fff;
  transition:transform .25s cubic-bezier(.34,1.56,.64,1); flex-shrink:0;
}
.soc-comment-send-btn:hover { transform:scale(1.1); background:var(--brand-d); }
.soc-comment-item { display:flex; gap:8px; margin-bottom:8px; animation:socFadeIn .2s ease both; }
.soc-comment-bubble { flex:1; background:var(--bg2); border-radius:0 var(--r2) var(--r2) var(--r2); padding:7px 10px; }
.soc-comment-author { font-size:11px; font-weight:800; color:var(--brand); margin-bottom:2px; cursor:pointer; }
.soc-comment-text { font-size:12.5px; color:var(--ink); line-height:1.5; }
.soc-comment-time { font-size:10px; color:var(--muted); margin-top:3px; }
.soc-skeleton-card {
  margin:0 13px 13px; background:var(--card); border-radius:var(--r3); border:1px solid var(--line);
  padding:13px; animation:skelPulse 1.4s ease-in-out infinite;
}
@keyframes skelPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
.soc-skel-row { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
.soc-skel-circle { width:38px; height:38px; border-radius:50%; background:var(--line); flex-shrink:0; }
.soc-skel-lines { flex:1; display:flex; flex-direction:column; gap:7px; }
.soc-skel-line { height:10px; background:var(--line); border-radius:5px; }
.soc-skel-line.w40{width:40%} .soc-skel-line.w70{width:70%} .soc-skel-line.w100{width:100%}
.soc-skel-img { height:160px; background:var(--line); border-radius:var(--r2); margin-top:9px; }
.soc-profile-cover { width:100%; height:165px; background:linear-gradient(145deg,var(--brand-d),var(--brand-l),#e5a343); position:relative; overflow:hidden; }
.soc-profile-cover img { width:100%; height:100%; object-fit:cover; }
.soc-profile-cover-overlay { position:absolute; inset:0; background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.28)); }
.soc-cover-edit-btn {
  position:absolute; bottom:9px; left:9px; background:rgba(0,0,0,.45); color:#fff; border:none;
  border-radius:var(--r2); padding:5px 10px; font-size:11px; font-weight:700; font-family:var(--f-ui);
  cursor:pointer; display:flex; align-items:center; gap:4px; backdrop-filter:blur(6px); transition:background .2s;
}
.soc-cover-edit-btn:hover { background:rgba(0,0,0,.65); }
.soc-cover-edit-btn.uploading,.soc-avatar-edit-btn.uploading { opacity:.6; pointer-events:none; }
.soc-profile-header { padding:0 16px 16px; background:var(--card); border-bottom:1px solid var(--line); }
.soc-profile-avatar-wrap { display:flex; align-items:flex-end; gap:12px; margin-top:-44px; margin-bottom:11px; }
.soc-profile-avatar-container { position:relative; flex-shrink:0; }
.soc-avatar-edit-btn {
  position:absolute; bottom:2px; left:2px; width:25px; height:25px; background:var(--brand);
  border:2px solid #fff; border-radius:50%; display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#fff; transition:transform .25s cubic-bezier(.34,1.56,.64,1);
}
.soc-avatar-edit-btn:hover { transform:scale(1.13); }
.soc-profile-name { font-size:18px; font-weight:900; color:var(--ink); display:flex; align-items:center; gap:6px; margin-bottom:2px; }
.soc-profile-handle { font-size:12px; color:var(--muted); }
.soc-profile-bio { font-size:13px; color:var(--ink2); line-height:1.6; margin:8px 0; }
.soc-profile-meta-row { display:flex; flex-wrap:wrap; gap:9px; font-size:11.5px; color:var(--muted); margin-bottom:12px; }
.soc-profile-meta-item { display:flex; align-items:center; gap:4px; }
.soc-profile-meta-item svg { width:12px; height:12px; color:var(--brand); }
.soc-profile-stats {
  display:flex; gap:16px; padding:12px 0;
  border-top:1px solid var(--line); border-bottom:1px solid var(--line); margin-bottom:13px;
}
.soc-stat-block { display:flex; flex-direction:column; align-items:center; gap:2px; cursor:pointer; flex:1; padding:7px 4px; border-radius:var(--r2); transition:background .2s; }
.soc-stat-block:hover { background:var(--bg2); }
.soc-stat-num { font-size:18px; font-weight:900; color:var(--ink); }
.soc-stat-label { font-size:10.5px; color:var(--muted); font-weight:700; }
.soc-follow-btn {
  padding:8px 22px; border-radius:var(--rpill); font-size:13px; font-weight:800; font-family:var(--f-ui);
  cursor:pointer; border:2px solid var(--brand); background:var(--brand); color:#fff;
  transition:all .25s cubic-bezier(.34,1.56,.64,1); display:flex; align-items:center; gap:6px;
}
.soc-follow-btn:hover { background:var(--brand-d); transform:scale(1.03); box-shadow:0 4px 16px rgba(27,107,58,.3); }
.soc-follow-btn.following { background:transparent; color:var(--brand); }
.soc-follow-btn.following:hover { background:#fdecea; border-color:#e74c3c; color:#e74c3c; }
.soc-follow-btn svg { width:14px; height:14px; }
.soc-profile-actions { display:flex; gap:7px; flex-wrap:wrap; }
.soc-msg-btn {
  padding:8px 16px; border-radius:var(--rpill); font-size:13px; font-weight:700; font-family:var(--f-ui);
  cursor:pointer; border:2px solid var(--line); background:var(--bg2); color:var(--ink);
  transition:all .2s; display:flex; align-items:center; gap:6px;
}
.soc-msg-btn:hover { border-color:var(--brand-l); background:var(--brand-pale); color:var(--brand); }
.soc-profile-tabs {
  display:flex; background:var(--card); border-bottom:1.5px solid var(--line);
  position:sticky; top:110px; z-index:9;
}
.soc-pt {
  flex:1; padding:12px 5px; text-align:center; font-size:12px; font-weight:700; color:var(--muted);
  cursor:pointer; border-bottom:2.5px solid transparent; transition:all .2s;
  background:none; border-left:none; border-right:none; border-top:none; font-family:var(--f-ui);
}
.soc-pt:hover { color:var(--brand); background:var(--brand-pale); }
.soc-pt.active { color:var(--brand); border-bottom-color:var(--brand); background:var(--brand-pale); }
.soc-profile-content { min-height:40vh; }
.soc-profile-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:50px 20px; text-align:center; gap:10px; color:var(--muted); }
.soc-profile-empty svg { opacity:.22; }
.soc-profile-empty-title { font-size:14.5px; font-weight:700; color:var(--ink); }
.soc-profile-products-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; padding:2px; }
.soc-profile-product-thumb { aspect-ratio:1; overflow:hidden; position:relative; cursor:pointer; background:var(--line); }
.soc-profile-product-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .3s cubic-bezier(.34,1.56,.64,1); }
.soc-profile-product-thumb:hover img { transform:scale(1.07); }
.soc-profile-product-thumb-overlay { position:absolute; inset:0; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; transition:background .2s; }
.soc-profile-product-thumb:hover .soc-profile-product-thumb-overlay { background:rgba(0,0,0,.32); }
.soc-profile-product-thumb-overlay span { color:#fff; font-size:11.5px; font-weight:800; opacity:0; transition:opacity .2s; }
.soc-profile-product-thumb:hover .soc-profile-product-thumb-overlay span { opacity:1; }
.soc-user-list-header {
  display:flex; align-items:center; gap:8px; padding:12px 16px; font-size:16px; font-weight:900;
  color:var(--ink); border-bottom:1px solid var(--line); cursor:pointer; background:var(--card);
  position:sticky; top:110px; z-index:10; transition:background .15s;
}
.soc-user-list-header:hover { background:var(--bg2); }
.soc-user-item {
  display:flex; align-items:center; gap:10px; padding:11px 16px;
  border-bottom:1px solid var(--line); transition:background .15s; cursor:pointer; animation:socCardIn .3s ease both;
}
.soc-user-item:hover { background:var(--bg2); }
.soc-user-item-info { flex:1; }
.soc-user-item-name { font-size:13px; font-weight:800; color:var(--ink); }
.soc-user-item-handle { font-size:11px; color:var(--muted); }
.soc-user-item-bio { font-size:11.5px; color:var(--ink2); margin-top:2px; line-height:1.4; }
.soc-suggest-section { padding:0 13px 13px; }
.soc-suggest-title { font-size:11px; font-weight:900; color:var(--muted); letter-spacing:.07em; text-transform:uppercase; padding:13px 0 8px; }
.soc-suggest-scroll { display:flex; gap:9px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; -ms-overflow-style:none; }
.soc-suggest-scroll::-webkit-scrollbar { display:none; }
.soc-suggest-card {
  flex-shrink:0; width:126px; background:var(--card); border:1.5px solid var(--line);
  border-radius:var(--r3); padding:13px 9px; text-align:center; cursor:pointer; transition:all .2s;
}
.soc-suggest-card:hover { box-shadow:0 4px 12px rgba(0,0,0,.06); border-color:var(--brand-l); }
.soc-suggest-name { font-size:12px; font-weight:800; color:var(--ink); margin:6px 0 2px; }
.soc-suggest-handle { font-size:10.5px; color:var(--muted); margin-bottom:8px; }
.soc-suggest-follow-btn {
  width:100%; padding:5px; border-radius:var(--rpill); font-size:11.5px; font-weight:800;
  background:var(--brand); color:#fff; border:none; cursor:pointer; font-family:var(--f-ui); transition:all .2s;
}
.soc-suggest-follow-btn:hover { background:var(--brand-d); }
.soc-suggest-follow-btn.following { background:var(--bg2); color:var(--brand); border:1.5px solid var(--brand-l); }
.soc-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  z-index:3000; display:flex; align-items:center; justify-content:center; padding:20px;
  opacity:0; pointer-events:none; transition:opacity .28s ease;
  box-sizing:border-box;
}
.soc-modal-overlay.open { opacity:1; pointer-events:all; }
.soc-modal {
  width:100%; max-width:500px; max-height:82vh; background:var(--card);
  border-radius:20px; overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  transform:scale(.93) translateY(10px); -webkit-transform:scale(.93) translateY(10px);
  transition:transform .32s cubic-bezier(.16,1,.3,1), opacity .28s ease;
  opacity:0;
  box-shadow:0 24px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06);
}
.soc-modal-overlay.open .soc-modal {
  transform:scale(1) translateY(0); -webkit-transform:scale(1) translateY(0);
  opacity:1;
}
.soc-modal-header {
  display:flex; align-items:center; justify-content:space-between; padding:15px 18px;
  border-bottom:1px solid var(--line); font-size:15px; font-weight:900; color:var(--ink);
  position:sticky; top:0; background:var(--card); z-index:1;
  border-radius:20px 20px 0 0;
}
.soc-modal-header span { font-family:var(--f-ui); }
.soc-modal-close { width:31px; height:31px; border-radius:50%; background:var(--bg2); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--muted); transition:all .2s; }
.soc-modal-close:hover { background:var(--line); color:var(--ink); }
.soc-modal-body { padding:16px; }
.soc-post-textarea {
  width:100%; min-height:120px; resize:none; border:1.5px solid var(--line); border-radius:var(--r2);
  padding:11px 13px; font-size:14px; line-height:1.6; font-family:var(--f-ui); color:var(--ink);
  background:var(--bg2); outline:none; transition:border-color .2s, background .2s;
  box-sizing:border-box; display:block; -webkit-appearance:none;
  direction:rtl; text-align:right;
}
.soc-post-textarea:focus { border-color:var(--brand-l); background:var(--bg); box-shadow:0 0 0 3px rgba(27,107,58,.08); }
.soc-post-images-preview { display:flex; gap:7px; flex-wrap:wrap; margin-top:10px; }
.soc-post-img-preview-item { width:72px; height:72px; border-radius:var(--r2); overflow:hidden; position:relative; }
.soc-post-img-preview-item img { width:100%; height:100%; object-fit:cover; }
.soc-post-img-remove { position:absolute; top:3px; left:3px; width:19px; height:19px; background:rgba(0,0,0,.6); color:#fff; border-radius:50%; border:none; cursor:pointer; font-size:10.5px; display:flex; align-items:center; justify-content:center; }
.soc-post-options-bar { display:flex; align-items:center; gap:7px; padding:10px 0; border-top:1px solid var(--line); margin-top:11px; }
.soc-post-opt-btn { min-width:36px; height:36px; padding:0 10px; border-radius:var(--r2); background:var(--bg2); border:1.5px solid var(--line); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; color:var(--muted); transition:all .2s; font-family:var(--f-ui); }
.soc-post-opt-btn:hover { border-color:var(--brand-l); color:var(--brand); background:var(--brand-pale); }
.soc-post-submit-btn {
  margin-right:auto; padding:8px 24px; border-radius:var(--rpill); background:var(--brand); color:#fff;
  font-size:13px; font-weight:800; font-family:var(--f-ui); border:none; cursor:pointer;
  transition:all .25s cubic-bezier(.34,1.56,.64,1); display:flex; align-items:center; gap:6px;
}
.soc-post-submit-btn:hover { background:var(--brand-d); transform:scale(1.03); box-shadow:0 4px 14px rgba(27,107,58,.28); }
.soc-post-submit-btn:disabled { opacity:.5; pointer-events:none; }
.soc-edit-field { margin-bottom:12px; }
.soc-edit-label { font-size:11px; font-weight:900; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; margin-bottom:5px; }
.soc-edit-input { width:100%; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--r2); font-size:13px; font-family:var(--f-ui); color:var(--ink); background:var(--bg2); outline:none; transition:border-color .2s; }
.soc-edit-input:focus { border-color:var(--brand-l); }
.soc-edit-textarea { resize:none; min-height:72px; }
.soc-msg-toast {
  position:fixed; bottom:84px; left:50%; transform:translateX(-50%) translateY(8px);
  background:var(--ink); color:#fff; padding:8px 16px; border-radius:var(--rpill);
  font-size:12.5px; font-weight:700; z-index:4000; opacity:0; pointer-events:none;
  transition:all .3s cubic-bezier(.16,1,.3,1); white-space:nowrap;
}
.soc-msg-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
.soc-notif-item { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line); transition:background .15s; cursor:pointer; animation:socCardIn .3s ease both; }
.soc-notif-item:hover { background:var(--bg2); }
.soc-notif-item.unread { background:var(--brand-pale); }
.soc-notif-icon { width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.soc-notif-icon.follow { background:#e8f5e9; color:var(--brand); }
.soc-notif-icon.like { background:#fdecea; color:#e74c3c; }
.soc-notif-icon.comment { background:#e3f2fd; color:#1565c0; }
.soc-notif-text { flex:1; font-size:12.5px; line-height:1.5; color:var(--ink); }
.soc-notif-text strong { font-weight:800; }
.soc-notif-time { font-size:10.5px; color:var(--muted); white-space:nowrap; }
.soc-lightbox { position:fixed; inset:0; background:rgba(0,0,0,.92); z-index:5000; display:none; align-items:center; justify-content:center; }
.soc-lightbox.open { display:flex; animation:socFadeIn .2s ease both; }
.soc-lightbox img { max-width:95vw; max-height:92vh; object-fit:contain; border-radius:var(--r2); }
.soc-lightbox-close { position:absolute; top:13px; left:13px; width:40px; height:40px; background:rgba(255,255,255,.15); border:none; border-radius:50%; cursor:pointer; color:#fff; font-size:19px; display:flex; align-items:center; justify-content:center; transition:background .2s; }
.soc-lightbox-close:hover { background:rgba(255,255,255,.3); }
.soc-load-spinner { display:flex; justify-content:center; padding:20px; }
.soc-spinner { width:28px; height:28px; border:3px solid var(--line); border-top-color:var(--brand); border-radius:50%; animation:socSpin .7s linear infinite; }
@keyframes socSpin { to{transform:rotate(360deg)} }
@media(max-width:700px) { .soc-feed-header,.soc-profile-tabs,.soc-user-list-header { top:58px; } }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ── SOCIAL MODULE LOGIC ────────────────────────────────────── */
(function() {
'use strict';

const S = {
  uid: null,
  profile: null,
  feedTab: 'following',
  feedLast: null,
  feedLoading: false,
  profileUid: null,
  imgs: [],
  initialized: false,
  authReady: false,
  _authListeners: [],
};

// Returns a promise that resolves once Firebase auth state is known
function waitForAuth() {
  return new Promise(resolve => {
    if (S.authReady) { resolve(); return; }
    // Add listener
    S._authListeners.push(resolve);
    // Safety timeout: resolve after 5s max so UI never hangs
    setTimeout(() => {
      const idx = S._authListeners.indexOf(resolve);
      if (idx !== -1) { S._authListeners.splice(idx, 1); resolve(); }
    }, 5000);
  });
}

const rel = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return Math.floor(s/60) + ' دقيقة';
  if (s < 86400) return Math.floor(s/3600) + ' ساعة';
  if (s < 604800) return Math.floor(s/86400) + ' يوم';
  return d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'});
};

const init = n => { if(!n)return'؟'; return n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join(''); };

const av = (p, sz='', uid='') => {
  const bg = p&&p.photoURL ? 'background:transparent;' : 'background:linear-gradient(145deg,var(--brand-l),var(--brand-d));';
  const oc = uid ? `onclick="SOCIAL.profile('${uid}')" style="cursor:pointer;"` : '';
  const inn = p&&p.photoURL ? `<img src="${p.photoURL}" alt="" loading="lazy">` : init(p&&(p.displayName||p.username));
  return `<div class="soc-avatar ${sz}" style="${bg}" ${oc}>${inn}</div>`;
};

const toast = msg => {
  const el = document.getElementById('soc-toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
};

const getDB = () => window.db || null;
const getAuth = () => window.auth || null;

// In-memory profile cache — eliminates repeated Firestore reads for same UID
const _profileCache = {};
async function getProfile(uid) {
  if (!uid) return null;
  if (_profileCache[uid]) return _profileCache[uid];
  const db = getDB(); if (!db) return null;
  try {
    const s = await db.collection('social_profiles').doc(uid).get();
    const data = s.exists ? s.data() : null;
    if (data) _profileCache[uid] = data;
    return data;
  } catch(e) { return null; }
}
function invalidateProfileCache(uid) {
  if (uid) delete _profileCache[uid];
}

async function ensureProfile(user) {
  const db = getDB(); if (!db || !user) return null;
  // Check cache first to avoid read on every auth state change
  if (_profileCache[user.uid]) return _profileCache[user.uid];
  const ref = db.collection('social_profiles').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const p = {
      uid: user.uid,
      displayName: user.displayName || 'مزارع',
      username: (user.email||'').split('@')[0].replace(/[^a-z0-9_]/gi,'').toLowerCase() || 'u_'+user.uid.slice(-6),
      photoURL: user.photoURL || '',
      coverURL: '', bio: '', location: '', farmName: '',
      followersCount: 0, followingCount: 0, postsCount: 0, verified: false,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(p); _profileCache[user.uid] = p; return p;
  }
  const data = snap.data(); _profileCache[user.uid] = data; return data;
}

async function isFollowing(a, b) {
  try { const s = await getDB().collection('social_follows').doc(`${a}_${b}`).get(); return s.exists; }
  catch(e) { return false; }
}

async function follow(a, b) {
  const db = getDB();
  const FV = firebase.firestore.FieldValue;
  // 1) سجّل المتابعة + الإشعار في batch
  const batch = db.batch();
  batch.set(db.collection('social_follows').doc(`${a}_${b}`), { followerUid:a, targetUid:b, createdAt:FV.serverTimestamp() });
  batch.set(db.collection('social_notifications').doc(), { toUid:b, fromUid:a, type:'follow', read:false, createdAt:FV.serverTimestamp() });
  await batch.commit();
  // 2) تحديث العدادات بـ update منفصل — الـ Rules بتسمح به صراحةً
  await db.collection('social_profiles').doc(a).update({ followingCount: FV.increment(1) });
  await db.collection('social_profiles').doc(b).update({ followersCount: FV.increment(1) });
}

async function unfollow(a, b) {
  const db = getDB();
  const FV = firebase.firestore.FieldValue;
  // 1) احذف المتابعة
  await db.collection('social_follows').doc(`${a}_${b}`).delete();
  // 2) تحديث العدادات بـ update منفصل
  await db.collection('social_profiles').doc(a).update({ followingCount: FV.increment(-1) });
  await db.collection('social_profiles').doc(b).update({ followersCount: FV.increment(-1) });
}

const skel = () => Array(3).fill(0).map(()=>`<div class="soc-skeleton-card"><div class="soc-skel-row"><div class="soc-skel-circle"></div><div class="soc-skel-lines"><div class="soc-skel-line w70"></div><div class="soc-skel-line w40"></div></div></div><div class="soc-skel-line w100" style="margin-bottom:5px"></div><div class="soc-skel-line w70"></div><div class="soc-skel-img"></div></div>`).join('');

function postCard(id, p, auth, delay) {
  const liked = (p.likedBy||[]).includes(S.uid);
  const saved = (p.savedBy||[]).includes(S.uid);
  const a = auth||{displayName:'مستخدم'};
  const lf = liked?'#e74c3c':'none', ls = liked?'#e74c3c':'currentColor';
  const sf = saved?'currentColor':'none';
  let imgs = '';
  if (p.images&&p.images.length) {
    const cls = p.images.length===1?'single':'grid2';
    imgs = `<div class="soc-post-images ${cls}">${p.images.slice(0,2).map(u=>`<img src="${u}" loading="lazy" onclick="SOCIAL.lb('${u}')" alt="">`).join('')}</div>`;
  }
  const vb = a.verified ? `<span class="soc-verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>` : '';
  return `<div class="soc-post-card" style="animation-delay:${delay*.055}s" data-pid="${id}">
<div class="soc-post-header">
  ${av(a,'soc-avatar-sm',p.authorUid)}
  <div class="soc-post-user-info">
    <div class="soc-post-username" onclick="SOCIAL.profile('${p.authorUid}')">${a.displayName||'مستخدم'}${vb}</div>
    <div class="soc-post-meta">${a.farmName?'🌿 '+a.farmName+' &bull; ':''}${rel(p.createdAt)}${a.location?' &bull; 📍 '+a.location:''}</div>
  </div>
  <button class="soc-post-more-btn" onclick="SOCIAL.menu('${id}','${p.authorUid}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button>
</div>
${p.text?`<div class="soc-post-text">${p.text.replace(/\n/g,'<br>').replace(/#(\S+)/g,'<span class="soc-post-tag">#$1</span>')}</div>`:''}
${imgs}
${(p.likesCount>0||p.commentsCount>0)?`<div class="soc-post-stats">
${p.likesCount>0?`<span class="soc-post-stat-item"><svg viewBox="0 0 24 24" fill="${lf}" stroke="${ls}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${p.likesCount}</span>`:''}
${p.commentsCount>0?`<span class="soc-post-stat-item" onclick="SOCIAL.cmts('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${p.commentsCount}</span>`:''}
</div>`:''}
<div class="soc-post-actions">
  <button class="soc-action-btn ${liked?'liked':''}" onclick="SOCIAL.like('${id}',this)"><svg viewBox="0 0 24 24" fill="${lf}" stroke="${ls}" stroke-width="2.2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>إعجاب</button>
  <button class="soc-action-btn" onclick="SOCIAL.cmts('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>تعليق</button>
  <button class="soc-action-btn" onclick="SOCIAL.share('${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>مشاركة</button>
  <button class="soc-action-btn ${saved?'saved':''}" onclick="SOCIAL.save('${id}',this)"><svg viewBox="0 0 24 24" fill="${sf}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>حفظ</button>
</div>
<div class="soc-comments-wrap" id="cw-${id}">
  <div class="soc-comment-input-row">${av(S.profile,'soc-avatar-sm')}<input type="text" class="soc-comment-input" placeholder="اكتب تعليقاً..." id="ci-${id}" onkeydown="if(event.key==='Enter')SOCIAL.sendCmt('${id}')"><button class="soc-comment-send-btn" onclick="SOCIAL.sendCmt('${id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>
  <div id="cl-${id}"></div>
</div>
</div>`;
}

async function loadFeed(reset) {
  if (S.feedLoading) return;
  S.feedLoading = true;
  const db = getDB();
  const cont = document.getElementById('soc-posts');
  if (!cont || !db) { S.feedLoading=false; return; }
  if (reset) { cont.innerHTML=skel(); S.feedLast=null; }
  try {
    let q;
    if (S.feedTab==='following' && S.uid) {
      const fs = await db.collection('social_follows').where('followerUid','==',S.uid).get();
      const uids = fs.docs.map(d=>d.data().targetUid);
      uids.push(S.uid);
      // Firestore 'in' requires at least 1 element and max 10
      const safeUids = uids.slice(0,10);
      // No orderBy on 'in' query — avoids composite index; sort client-side
      q = db.collection('social_posts').where('authorUid','in',safeUids).limit(20);
    } else {
      // Explore: fetch posts, sort client-side
      q = db.collection('social_posts').limit(20);
    }
    if (S.feedLast && !reset) q = q.startAfter(S.feedLast);
    const snap = await q.get();
    // Sort client-side by createdAt descending (avoids composite index)
    const sortedDocs = snap.docs.slice().sort((a,b)=>{
      const ta=a.data().createdAt; const tb=b.data().createdAt;
      const sa=ta&&ta.seconds?ta.seconds:0; const sb=tb&&tb.seconds?tb.seconds:0;
      return sb-sa;
    });
    S.feedLast = sortedDocs[sortedDocs.length-1]||null;
    const uids2 = [...new Set(sortedDocs.map(d=>d.data().authorUid))];
    const pm = {}; await Promise.all(uids2.map(async u=>{pm[u]=await getProfile(u);}));
    if (sortedDocs.length === 0 && reset) {
      // If following tab is empty, suggest switching to explore
      const emptyMsg = S.feedTab==='following'
        ? `<div class="soc-profile-empty" style="margin:24px 13px;background:var(--card);border-radius:var(--r3);border:1px solid var(--line)"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div class="soc-profile-empty-title">لا توجد منشورات من المتابَعين بعد</div><button onclick="SOCIAL.ftab('explore')" style="margin-top:9px;padding:7px 18px;background:var(--brand);color:#fff;border:none;border-radius:var(--rpill);font-size:12.5px;font-weight:800;font-family:var(--f-ui);cursor:pointer">استكشاف عام</button></div>`
        : `<div class="soc-profile-empty" style="margin:24px 13px;background:var(--card);border-radius:var(--r3);border:1px solid var(--line)"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div class="soc-profile-empty-title">لا توجد منشورات بعد</div></div>`;
      cont.innerHTML = emptyMsg;
    } else {
      const html = sortedDocs.map((d,i)=>postCard(d.id,d.data(),pm[d.data().authorUid],i)).join('');
      if (reset) cont.innerHTML = html; else cont.insertAdjacentHTML('beforeend',html);
    }
    const lm = document.getElementById('soc-lm');
    if (lm) lm.style.display = sortedDocs.length < 7 ? 'none' : 'flex';
  } catch(e) {
    console.warn('loadFeed error:', e.code || e.message);
    if (reset) {
      const errMsg = e.code === 'permission-denied'
        ? 'لا توجد صلاحية للوصول — يُرجى مراجعة إعدادات Firebase'
        : 'حدث خطأ في تحميل المنشورات';
      if (cont) cont.innerHTML = `<div class="soc-profile-empty" style="margin:24px 13px;background:var(--card);border-radius:var(--r3);border:1px solid var(--line)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div class="soc-profile-empty-title">${errMsg}</div>
        <button onclick="loadFeed(true)" style="margin-top:9px;padding:7px 18px;background:var(--brand);color:#fff;border:none;border-radius:var(--rpill);font-size:12.5px;font-weight:800;font-family:var(--f-ui);cursor:pointer">إعادة المحاولة</button>
      </div>`;
    }
  }
  S.feedLoading = false;
}

async function suggestHtml() {
  const db = getDB(); if (!db) return '';
  try {
    const snap = await db.collection('social_profiles').orderBy('followersCount','desc').limit(6).get();
    const docs = snap.docs.filter(d=>d.id!==S.uid).slice(0,5);
    if (!docs.length) return '';
    const cards = docs.map(d=>{
      const p=d.data();
      const inn = p.photoURL?`<img src="${p.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:init(p.displayName);
      const bg = p.photoURL?'background:transparent;':'background:linear-gradient(145deg,var(--brand-l),var(--brand-d));';
      return `<div class="soc-suggest-card" data-suggest-uid="${d.id}" onclick="SOCIAL.profile('${d.id}')">
<div class="soc-avatar" style="width:46px;height:46px;font-size:16px;margin:0 auto;${bg}">${inn}</div>
<div class="soc-suggest-name">${p.displayName||'مزارع'}</div>
<div class="soc-suggest-handle">${p.location||'@'+(p.username||'')}</div>
<button class="soc-suggest-follow-btn" onclick="event.stopPropagation();SOCIAL.follow('${d.id}',this)">متابعة</button>
</div>`;
    }).join('');
    return `<div class="soc-suggest-section"><div class="soc-suggest-title">حسابات مقترحة</div><div class="soc-suggest-scroll">${cards}</div></div>`;
  } catch(e){return '';}
}

async function renderFeed() {
  const root = document.getElementById('social-feed-root');
  if (!root) return;
  // Render shell IMMEDIATELY — don't await suggestHtml first
  root.innerHTML = `
<div class="soc-feed-header">
  <div class="soc-feed-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>الفيد الزراعي</div>
  <div class="soc-feed-tabs"><button class="soc-ft active" id="sft-f" onclick="SOCIAL.ftab('following')">متابَعون</button><button class="soc-ft" id="sft-e" onclick="SOCIAL.ftab('explore')">استكشاف</button></div>
</div>
${S.uid?`<div class="soc-create-card" onclick="SOCIAL.openPost()">${av(S.profile,'soc-avatar-sm')}<div style="flex:1"><div class="soc-create-placeholder" onclick="event.stopPropagation();SOCIAL.openPost()">شارك تجربتك الزراعية مع المجتمع...</div><div class="soc-create-actions"><button class="soc-create-action-btn" onclick="event.stopPropagation();SOCIAL.openPost()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>صورة</button><button class="soc-create-action-btn" onclick="event.stopPropagation();SOCIAL.openPost()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>منتج</button><button class="soc-create-action-btn" onclick="event.stopPropagation();SOCIAL.openPost()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>موقع</button></div></div></div>`:`<div style="margin:12px;padding:13px;background:var(--brand-pale);border-radius:var(--r2);text-align:center;font-size:13px;color:var(--brand);font-weight:700;">سجّل الدخول للتفاعل مع المجتمع الزراعي 🌿</div>`}
<div id="soc-suggest-slot"></div>
<div id="soc-posts">${skel()}</div>
<div class="soc-load-spinner" id="soc-lm" style="display:none;"><div class="soc-spinner"></div></div>`;
  const io = new IntersectionObserver(e=>{if(e[0].isIntersecting&&!S.feedLoading)loadFeed(false);},{threshold:.1});
  const lm = document.getElementById('soc-lm'); if(lm) io.observe(lm);
  // Load posts immediately, load suggestions in background
  loadFeed(true);
  suggestHtml().then(sg => {
    const slot = document.getElementById('soc-suggest-slot');
    if (slot && sg) slot.outerHTML = sg;
  });
}

async function renderProfile(uid, isSelf) {
  const root = document.getElementById('social-profile-root');
  if (!root) return;
  root.innerHTML = `<div style="padding:55px;text-align:center"><div class="soc-load-spinner"><div class="soc-spinner"></div></div></div>`;
  // Run getProfile and isFollowing in parallel for speed
  const [p, fol] = await Promise.all([
    getProfile(uid),
    (S.uid && !isSelf) ? isFollowing(S.uid, uid) : Promise.resolve(false)
  ]);
  if (!p) { root.innerHTML=`<div class="soc-profile-empty"><div class="soc-profile-empty-title">الصفحة غير موجودة</div></div>`; return; }
  const cov = p.coverURL ? `background-image:url('${p.coverURL}');background-size:cover;background-position:center;` : `background:linear-gradient(145deg,var(--brand-d),var(--brand-l),#e5a343);`;
  const vb = p.verified ? `<span class="soc-verified-badge"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>` : '';
  root.innerHTML = `
<div class="soc-profile-cover" style="${cov}">
  <div class="soc-profile-cover-overlay"></div>
  ${isSelf?`<button class="soc-cover-edit-btn" onclick="document.getElementById('soc-cover-input').click()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>تغيير الغلاف</button>`:''}
</div>
<div class="soc-profile-header">
  <div class="soc-profile-avatar-wrap">
    <div class="soc-profile-avatar-container">
      ${av(p,'soc-avatar-xl')}
      ${isSelf?`<button class="soc-avatar-edit-btn" onclick="document.getElementById('soc-avatar-input').click()"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>`:''}
    </div>
  </div>
  <div class="soc-profile-name">${p.displayName||'مزارع'}${vb}</div>
  <div class="soc-profile-handle">@${p.username||uid.slice(0,8)}</div>
  ${p.farmName?`<div style="margin-top:3px;font-size:12.5px;color:var(--brand);font-weight:700;">🌿 ${p.farmName}</div>`:''}
  ${p.bio?`<div class="soc-profile-bio">${p.bio}</div>`:''}
  <div class="soc-profile-meta-row">
    ${p.location?`<span class="soc-profile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>${p.location}</span>`:''}
    ${p.joinedAt?`<span class="soc-profile-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>انضم ${rel(p.joinedAt)}</span>`:''}
  </div>
  <div class="soc-profile-stats">
    <div class="soc-stat-block" onclick="SOCIAL.followers('${uid}')"><div class="soc-stat-num" id="spf">${p.followersCount||0}</div><div class="soc-stat-label">متابع</div></div>
    <div class="soc-stat-block" onclick="SOCIAL.following('${uid}')"><div class="soc-stat-num">${p.followingCount||0}</div><div class="soc-stat-label">يتابع</div></div>
    <div class="soc-stat-block"><div class="soc-stat-num">${p.postsCount||0}</div><div class="soc-stat-label">منشور</div></div>
  </div>
  <div class="soc-profile-actions">
    ${isSelf?`<button class="soc-follow-btn" onclick="SOCIAL.openEdit()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>تعديل الصفحة</button>
    <button class="soc-msg-btn" onclick="SOCIAL.openPost()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>منشور جديد</button>`:
    `<button class="soc-follow-btn ${fol?'following':''}" id="sfbm" onclick="SOCIAL.follow('${uid}',this)">${fol?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>تتابعه`:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>متابعة`}</button>
    <button class="soc-msg-btn" onclick="SOCIAL.soon()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>مراسلة</button>`}
  </div>
</div>
<div class="soc-profile-tabs">
  <button class="soc-pt active" onclick="SOCIAL.ptab('posts','${uid}')">منشورات</button>
  <button class="soc-pt" onclick="SOCIAL.ptab('products','${uid}')">منتجات</button>
  <button class="soc-pt" onclick="SOCIAL.ptab('photos','${uid}')">صور</button>
</div>
<div class="soc-profile-content" id="soc-pc"><div class="soc-load-spinner" style="padding:38px 0"><div class="soc-spinner"></div></div></div>`;
  ptab('posts', uid);
}

async function ptab(tab, uid) {
  const el = document.getElementById('soc-pc'); if (!el) return;
  document.querySelectorAll('.soc-pt').forEach((b,i)=>b.classList.toggle('active',['posts','products','photos'][i]===tab));
  el.innerHTML = `<div class="soc-load-spinner" style="padding:38px 0"><div class="soc-spinner"></div></div>`;
  // Safety timeout — if query hangs > 8s show error
  const spinTimeout = setTimeout(() => {
    if (el.querySelector('.soc-spinner')) {
      el.innerHTML = `<div class="soc-profile-empty"><div class="soc-profile-empty-title">انتهت مهلة التحميل — تحقق من الاتصال</div><button onclick="ptab('${tab}','${uid}')" style="margin-top:9px;padding:7px 18px;background:var(--brand);color:#fff;border:none;border-radius:var(--rpill);font-size:12.5px;font-weight:800;font-family:var(--f-ui);cursor:pointer">إعادة المحاولة</button></div>`;
    }
  }, 8000);
  const db = getDB();
  if (!db) {
    clearTimeout(spinTimeout);
    el.innerHTML = `<div class="soc-profile-empty"><div class="soc-profile-empty-title">تعذّر الاتصال بالخادم</div></div>`;
    return;
  }
  const emptyHtml = (icon, label) => `<div class="soc-profile-empty">${icon}<div class="soc-profile-empty-title">${label}</div></div>`;
  try {
    if (tab==='posts') {
      // No orderBy = no composite index needed; sort client-side
      const snap = await db.collection('social_posts').where('authorUid','==',uid).limit(15).get();
      if (snap.empty) { el.innerHTML=emptyHtml(`<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`,'لا توجد منشورات بعد'); return; }
      const sortedDocs = snap.docs.slice().sort((a,b)=>{ const ta=a.data().createdAt; const tb=b.data().createdAt; const sa=ta&&ta.seconds?ta.seconds:0; const sb=tb&&tb.seconds?tb.seconds:0; return sb-sa; });
      const authorProfile = await getProfile(uid);
      el.innerHTML = sortedDocs.map((d,i)=>postCard(d.id,d.data(),authorProfile,i)).join('');
    } else if (tab==='products') {
      // Try both sellerId and ownerId fields for compatibility
      // ownerId is indexed; try ownerId first, fallback to sellerId without orderBy
      let snap = await db.collection('marketplace_products').where('ownerId','==',uid).limit(18).get();
      if (snap.empty) snap = await db.collection('marketplace_products').where('sellerId','==',uid).limit(18).get();
      if (snap.empty) { el.innerHTML=emptyHtml(`<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>`,'لا توجد منتجات'); return; }
      el.innerHTML=`<div class="soc-profile-products-grid">${snap.docs.map(d=>{const p=d.data(),img=p.images&&p.images[0]||p.imageURL;return`<div class="soc-profile-product-thumb" onclick="MKT&&MKT.openDetail&&MKT.openDetail('${d.id}')">${img?`<img src="${img}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg2);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><rect x="3" y="3" width="18" height="18" rx="3"/></svg></div>`}<div class="soc-profile-product-thumb-overlay"><span>${p.price?p.price+' ج.م':''}</span></div></div>`;}).join('')}</div>`;
    } else {
      // Photos tab — posts with images
      // No orderBy = no composite index needed
      const snap = await db.collection('social_posts').where('authorUid','==',uid).limit(30).get();
      const imgs=[]; snap.docs.forEach(d=>{ const dd=d.data(); if(dd.images&&dd.images.length) dd.images.forEach(u=>imgs.push(u)); });
      if(!imgs.length){el.innerHTML=emptyHtml(`<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,'لا توجد صور');return;}
      el.innerHTML=`<div class="soc-profile-products-grid">${imgs.map(u=>`<div class="soc-profile-product-thumb" onclick="SOCIAL.lb('${u}')"><img src="${u}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"><div class="soc-profile-product-thumb-overlay"><span>عرض</span></div></div>`).join('')}</div>`;
    }
  } catch(e) {
    console.warn('ptab error', tab, e.code || e.message);
    clearTimeout(spinTimeout);
    const errLabel = (e.code === 'permission-denied' || e.code === 7)
      ? 'خطأ في الصلاحيات — افتح Firebase Console وحدّث Firestore Rules'
      : (e.code === 'failed-precondition' || e.code === 9)
      ? 'خطأ في Index — افتح Firebase Console وأضف Composite Index'
      : `خطأ (${e.code||'unknown'}): ${e.message||''}`;
    el.innerHTML = emptyHtml(`<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`, errLabel);
  } finally {
    clearTimeout(spinTimeout);
  }
}

async function renderFollowers(uid) {
  const root=document.getElementById('social-followers-root'); if(!root)return;
  root.innerHTML=`<div class="soc-load-spinner" style="padding:55px 0"><div class="soc-spinner"></div></div>`;
  const snap=await getDB().collection('social_follows').where('targetUid','==',uid).limit(30).get();
  const uids=snap.docs.map(d=>d.data().followerUid);
  const profs=await Promise.all(uids.map(getProfile));
  root.innerHTML=`<div class="soc-user-list-header" onclick="SOCIAL.backProfile()"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>المتابعون (${snap.docs.length})</div>${uids.length===0?`<div class="soc-profile-empty"><div class="soc-profile-empty-title">لا يوجد متابعون بعد</div></div>`:profs.map((p,i)=>p?userItem(uids[i],p):'').join('')}`;
}

async function renderFollowing(uid) {
  const root=document.getElementById('social-following-root'); if(!root)return;
  root.innerHTML=`<div class="soc-load-spinner" style="padding:55px 0"><div class="soc-spinner"></div></div>`;
  const snap=await getDB().collection('social_follows').where('followerUid','==',uid).limit(30).get();
  const uids=snap.docs.map(d=>d.data().targetUid);
  const profs=await Promise.all(uids.map(getProfile));
  root.innerHTML=`<div class="soc-user-list-header" onclick="SOCIAL.backProfile()"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>يتابع (${snap.docs.length})</div>${uids.length===0?`<div class="soc-profile-empty"><div class="soc-profile-empty-title">لا يتابع أحدًا بعد</div></div>`:profs.map((p,i)=>p?userItem(uids[i],p):'').join('')}`;
}

function userItem(uid, p) {
  const my=S.uid;
  return `<div class="soc-user-item" onclick="SOCIAL.profile('${uid}')">${av(p,'soc-avatar-sm')}<div class="soc-user-item-info"><div class="soc-user-item-name">${p.displayName||'مزارع'}</div><div class="soc-user-item-handle">@${p.username||uid.slice(0,8)}</div>${p.bio?`<div class="soc-user-item-bio">${p.bio.slice(0,52)}${p.bio.length>52?'...':''}</div>`:''}</div>${my&&my!==uid?`<button class="soc-follow-btn" style="padding:6px 13px;font-size:11.5px;" onclick="event.stopPropagation();SOCIAL.follow('${uid}',this)">متابعة</button>`:''}</div>`;
}

function injectGlobal() {
  if (document.getElementById('soc-g')) return;
  const el = document.createElement('div');
  el.id = 'soc-g';
  el.innerHTML = `
<div class="soc-msg-toast" id="soc-toast"></div>
<div class="soc-lightbox" id="soc-lb" onclick="if(event.target===this)SOCIAL.closeLb()">
  <button class="soc-lightbox-close" onclick="SOCIAL.closeLb()">✕</button>
  <img id="soc-lb-img" src="" alt="">
</div>
<div class="soc-modal-overlay" id="soc-pm" onclick="if(event.target===this)SOCIAL.closePost()">
  <div class="soc-modal" dir="rtl">
    <div class="soc-modal-header"><span>منشور جديد</span><button class="soc-modal-close" onclick="SOCIAL.closePost()">✕</button></div>
    <div class="soc-modal-body" style="padding:16px 15px 20px;">
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
        <div id="soc-pma" style="flex-shrink:0;padding-top:2px;"></div>
        <textarea class="soc-post-textarea" id="soc-post-text"
          placeholder="شارك خبرتك الزراعية مع المجتمع..."
          dir="rtl" autocomplete="off" autocorrect="off" spellcheck="true"
          rows="4"
        ></textarea>
      </div>
      <div class="soc-post-images-preview" id="soc-pip"></div>
      <div class="soc-post-options-bar" style="display:flex;align-items:center;gap:8px;padding:10px 0 0;border-top:1px solid var(--line);margin-top:8px;flex-wrap:wrap;">
        <button class="soc-post-opt-btn" title="إضافة صورة" onclick="document.getElementById('soc-iu').click()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style="font-size:11px;font-weight:700;color:var(--muted)">صورة</span>
        </button>
        <input type="file" id="soc-iu" accept="image/*" multiple style="display:none" onchange="SOCIAL.imgUp(event)">
        <button class="soc-post-opt-btn" title="إضافة هاشتاق" onclick="document.getElementById('soc-post-text').value+=' #';document.getElementById('soc-post-text').focus()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
          <span style="font-size:11px;font-weight:700;color:var(--muted)">#هاشتاق</span>
        </button>
        <button class="soc-post-submit-btn" id="soc-psb" onclick="SOCIAL.submitPost()" style="margin-right:auto;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          نشر الآن
        </button>
      </div>
    </div>
  </div>
</div>
<input type="file" id="soc-avatar-input" accept="image/*" style="display:none" onchange="SOCIAL.uploadImg(event,'avatar')">
<input type="file" id="soc-cover-input" accept="image/*" style="display:none" onchange="SOCIAL.uploadImg(event,'cover')">
<div class="soc-modal-overlay" id="soc-em" onclick="if(event.target===this)SOCIAL.closeEdit()">
  <div class="soc-modal" dir="rtl">
    <div class="soc-modal-header"><span>تعديل الصفحة</span><button class="soc-modal-close" onclick="SOCIAL.closeEdit()">✕</button></div>
    <div class="soc-modal-body">
      <div class="soc-edit-field"><div class="soc-edit-label">الاسم</div><input type="text" class="soc-edit-input" id="soc-en" placeholder="اسمك الكامل"></div>
      <div class="soc-edit-field"><div class="soc-edit-label">اسم المستخدم</div><input type="text" class="soc-edit-input" id="soc-eu" placeholder="username"></div>
      <div class="soc-edit-field"><div class="soc-edit-label">اسم المزرعة</div><input type="text" class="soc-edit-input" id="soc-ef" placeholder="مزرعة ..."></div>
      <div class="soc-edit-field"><div class="soc-edit-label">نبذة تعريفية</div><textarea class="soc-edit-input soc-edit-textarea" id="soc-eb" placeholder="اكتب نبذة عن نشاطك..."></textarea></div>
      <div class="soc-edit-field"><div class="soc-edit-label">الموقع</div><input type="text" class="soc-edit-input" id="soc-el" placeholder="المحافظة / المدينة"></div>
      <button class="soc-post-submit-btn" id="soc-esb" style="width:100%;justify-content:center;margin-top:3px;" onclick="SOCIAL.saveProfile()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>حفظ التغييرات</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(el);
}

// Social panels that SOCIAL module manages directly
const SOCIAL_PANELS = ['feed','profile-me','followers','following'];

function switchPanel(name) {
  const isSocialPanel = SOCIAL_PANELS.includes(name);

  if (isSocialPanel) {
    // For social panels: manage directly without waiting for MKT animation
    // Remove active from all panels
    document.querySelectorAll('.mkt-panel').forEach(p => {
      p.classList.remove('active');
      p.classList.remove('leaving');
    });
    // Activate the target panel immediately
    const panel = document.getElementById('mkt-panel-' + name);
    if (panel) panel.classList.add('active');
    // Update tab highlight
    document.querySelectorAll('.mkt-tab').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('mkt-tab-' + name);
    if (tab) tab.classList.add('active');
    // Reset MKT transitioning flag so MKT isn't stuck
    if (window.mktState) window.mktState._transitioning = false;
  } else {
    // Non-social panels: delegate to MKT
    if (window.MKT && window.MKT.showPanel) window.MKT.showPanel(name);
  }
}

/* ─── PUBLIC API ─────────────────────────────────────────────── */
window.SOCIAL = {
  async init() {
    if (S.initialized) return;
    S.initialized = true;
    injectGlobal();
    const auth = getAuth(); 
    if (!auth) {
      // Firebase not ready yet, retry after short delay
      S.initialized = false;
      setTimeout(() => SOCIAL.init(), 500);
      return;
    }
    auth.onAuthStateChanged(async user => {
      S.uid = user ? user.uid : null;
      S.profile = user ? await ensureProfile(user) : null;
      if (!S.authReady) {
        S.authReady = true;
        S._authListeners.forEach(fn => fn());
        S._authListeners = [];
      }
    });
  },

  async show(name) {
    switchPanel(name);
    await waitForAuth();
    if (name==='feed') renderFeed();
    if (name==='profile-me') {
      if (S.uid) { S.profileUid=S.uid; renderProfile(S.uid,true); }
      else {
        const r=document.getElementById('social-profile-root');
        if(r) r.innerHTML=`<div class="soc-profile-empty" style="padding:65px 20px;"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".25"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><div class="soc-profile-empty-title">سجّل الدخول لعرض صفحتك</div></div>`;
      }
    }
  },

  async profile(uid) {
    if (!uid) return;
    S.profileUid = uid;
    switchPanel('profile-me');
    await waitForAuth();
    const isSelf = uid===S.uid;
    renderProfile(uid,isSelf);
  },

  ftab(tab) {
    S.feedTab=tab;
    document.querySelectorAll('.soc-ft').forEach(b=>b.classList.toggle('active',(tab==='following'&&b.id==='sft-f')||(tab==='explore'&&b.id==='sft-e')));
    loadFeed(true);
  },

  ptab(tab, uid) { ptab(tab, uid||S.profileUid); },

  async follow(targetUid, btn) {
    if (!S.uid){toast('سجّل الدخول أولاً');return;}
    // منع الضغط المزدوج
    if (btn._following) return;
    btn._following = true;
    btn.disabled = true;
    const curr = btn.classList.contains('following');
    const svgFollow = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`;
    const svgFollowing = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`;
    try {
      if (curr) {
        await unfollow(S.uid, targetUid);
        btn.classList.remove('following');
        btn.innerHTML = svgFollow + ' متابعة';
        toast('تم إلغاء المتابعة');
      } else {
        await follow(S.uid, targetUid);
        btn.classList.add('following');
        btn.innerHTML = svgFollowing + ' تتابعه';
        toast('✅ تم المتابعة');
        // إخفاء الكارد من الحسابات المقترحة بعد المتابعة
        const card = btn.closest('[data-suggest-uid]');
        if (card) {
          card.style.transition = 'opacity .3s, transform .3s';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.85)';
          setTimeout(() => { card.remove(); }, 300);
        }
      }
      // تحديث عداد المتابعين في صفحة البروفايل لو مفتوحة
      if (S.profileUid === targetUid) {
        const np = await getProfile(targetUid);
        const el = document.getElementById('spf');
        if (el && np) el.textContent = np.followersCount || 0;
      }
    } catch(e) {
      // رجّع الـ UI للحالة الأصلية لو فشل
      btn.classList.toggle('following', curr);
      btn.innerHTML = curr ? (svgFollowing + ' تتابعه') : (svgFollow + ' متابعة');
      const msg = e.code === 'permission-denied'
        ? 'تحقق من Firestore Rules في Firebase Console'
        : 'حدث خطأ، حاول مرة أخرى';
      toast(msg);
      console.error('follow error:', e.code, e.message);
    }
    btn._following = false;
    btn.disabled = false;
  },

  async like(postId, btn) {
    if (!S.uid) { toast('سجّل الدخول أولاً'); return; }
    const db = getDB(); if (!db) { toast('سجّل الدخول أولاً'); return; }
    if (btn._liking) return;
    btn._liking = true;

    // ── Optimistic UI update immediately ──
    const wasLiked = btn.classList.contains('liked');
    const svg = btn.querySelector('svg');
    const applyLiked = (on) => {
      btn.classList.toggle('liked', on);
      if (svg) {
        svg.setAttribute('fill', on ? '#e74c3c' : 'none');
        svg.setAttribute('stroke', on ? '#e74c3c' : 'currentColor');
      }
    };
    applyLiked(!wasLiked);
    if (!wasLiked) {
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.transform = ''; }, 220);
    }

    try {
      const ref = db.collection('social_posts').doc(postId);
      const FV = firebase.firestore.FieldValue;
      await ref.update({
        likesCount: FV.increment(wasLiked ? -1 : 1),
        likedBy: wasLiked ? FV.arrayRemove(S.uid) : FV.arrayUnion(S.uid)
      });

      // Send notification async — don't await, don't block like
      if (!wasLiked) {
        ref.get().then(snap => {
          if (snap.exists && snap.data().authorUid !== S.uid) {
            db.collection('social_notifications').add({
              toUid: snap.data().authorUid, fromUid: S.uid,
              type: 'like', postId, read: false,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch(e) {
      applyLiked(wasLiked); // revert
      const msg = e.code === 'permission-denied'
        ? 'تحقق من Firestore Rules في Firebase Console'
        : 'حدث خطأ، حاول مرة أخرى';
      toast(msg);
      console.error('like error:', e.code, e.message);
    }
    btn._liking = false;
  },

  async save(postId, btn) {
    if(!S.uid||!getDB()){toast('سجّل الدخول أولاً');return;}
    const ref=getDB().collection('social_posts').doc(postId);
    const snap=await ref.get(); const saved=(snap.data().savedBy||[]).includes(S.uid);
    await ref.update({savedBy:saved?firebase.firestore.FieldValue.arrayRemove(S.uid):firebase.firestore.FieldValue.arrayUnion(S.uid)});
    btn.classList.toggle('saved',!saved); const svg=btn.querySelector('svg'); if(svg) svg.setAttribute('fill',saved?'none':'currentColor');
    toast(saved?'تم إلغاء الحفظ':'✅ تم حفظ المنشور');
  },

  cmts(postId) { const el=document.getElementById(`cw-${postId}`); if(!el)return; const open=el.classList.toggle('open'); if(open) this.loadCmts(postId); },

  async loadCmts(postId) {
    const el=document.getElementById(`cl-${postId}`); if(!el||!getDB())return;
    const snap=await getDB().collection('social_posts').doc(postId).collection('comments').orderBy('createdAt','asc').limit(10).get();
    if(snap.empty){el.innerHTML='';return;}
    const uids=[...new Set(snap.docs.map(d=>d.data().authorUid))];
    const pm={}; await Promise.all(uids.map(async u=>{pm[u]=await getProfile(u);}));
    el.innerHTML=snap.docs.map(d=>{const c=d.data(),p=pm[c.authorUid]||{};return`<div class="soc-comment-item">${av(p,'soc-avatar-sm',c.authorUid)}<div class="soc-comment-bubble"><div class="soc-comment-author" onclick="SOCIAL.profile('${c.authorUid}')">${p.displayName||'مستخدم'}</div><div class="soc-comment-text">${c.text||''}</div><div class="soc-comment-time">${rel(c.createdAt)}</div></div></div>`;}).join('');
  },

  async sendCmt(postId) {
    if(!S.uid||!getDB()){toast('سجّل الدخول أولاً');return;}
    const inp=document.getElementById(`ci-${postId}`); const text=inp?inp.value.trim():''; if(!text)return;
    inp.value='';
    await getDB().collection('social_posts').doc(postId).collection('comments').add({authorUid:S.uid,text,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    await getDB().collection('social_posts').doc(postId).update({commentsCount:firebase.firestore.FieldValue.increment(1)});
    await this.loadCmts(postId);
    const snap=await getDB().collection('social_posts').doc(postId).get();
    if(snap.data().authorUid!==S.uid) getDB().collection('social_notifications').add({toUid:snap.data().authorUid,fromUid:S.uid,type:'comment',postId,read:false,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  },

  share(postId) {
    const url=`${location.origin}${location.pathname}#post/${postId}`;
    if(navigator.share)navigator.share({title:'نبتيكس',url});else if(navigator.clipboard){navigator.clipboard.writeText(url);toast('✅ تم نسخ الرابط');}
    if(getDB())getDB().collection('social_posts').doc(postId).update({sharesCount:firebase.firestore.FieldValue.increment(1)});
  },

  menu(postId, authorUid) {
    if(S.uid===authorUid){if(confirm('هل تريد حذف هذا المنشور؟'))this.delPost(postId);}else toast('تم الإبلاغ، شكراً');
  },

  async delPost(postId) {
    const db=getDB(); if(!db||!S.uid)return;
    await db.collection('social_posts').doc(postId).delete();
    await db.collection('social_profiles').doc(S.uid).update({postsCount:firebase.firestore.FieldValue.increment(-1)});
    const el=document.querySelector(`[data-pid="${postId}"]`);
    if(el) el.style.cssText='opacity:0;transform:scale(.93);transition:.3s;height:0;overflow:hidden;margin:0;padding:0;';
    toast('✅ تم حذف المنشور');
  },

  openPost() {
    if(!S.uid){toast('سجّل الدخول أولاً');return;}
    const m=document.getElementById('soc-pm'); if(!m)return;
    // Reset textarea first (before open so layout is calculated)
    const ta=document.getElementById('soc-post-text');
    if(ta){ ta.value=''; }
    S.imgs=[]; this.renderPrev();
    // Set avatar
    const pma=document.getElementById('soc-pma');
    if(pma) pma.innerHTML=av(S.profile,'soc-avatar-sm');
    // Open modal
    m.classList.add('open');
    // Delay focus until after animation (important for iOS)
    setTimeout(() => {
      const taFocus=document.getElementById('soc-post-text');
      if(taFocus){ taFocus.focus(); }
    }, 420);
  },
  closePost() {
    const m=document.getElementById('soc-pm');
    if(m) m.classList.remove('open');
  },

  imgUp(e) {
    Array.from(e.target.files).slice(0,4-S.imgs.length).forEach(f=>{
      const r=new FileReader(); r.onload=ev=>{S.imgs.push(ev.target.result);this.renderPrev();}; r.readAsDataURL(f);
    });
  },
  renderPrev() {
    const el=document.getElementById('soc-pip'); if(!el)return;
    el.innerHTML=S.imgs.map((u,i)=>`<div class="soc-post-img-preview-item"><img src="${u}"><button class="soc-post-img-remove" onclick="SOCIAL.rmImg(${i})">✕</button></div>`).join('');
  },
  rmImg(i) { S.imgs.splice(i,1); this.renderPrev(); },

  async submitPost() {
    const db=getDB(); if(!S.uid||!db)return;
    const ta=document.getElementById('soc-post-text'); const text=ta?ta.value.trim():'';
    if(!text&&S.imgs.length===0){toast('اكتب شيئاً أو أضف صورة');return;}
    const btn=document.getElementById('soc-psb'); if(btn)btn.disabled=true;
    try {
      await db.collection('social_posts').add({authorUid:S.uid,text,images:S.imgs,hasImages:S.imgs.length>0,likesCount:0,commentsCount:0,sharesCount:0,likedBy:[],savedBy:[],createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      await db.collection('social_profiles').doc(S.uid).update({postsCount:firebase.firestore.FieldValue.increment(1)});
      this.closePost(); toast('✅ تم نشر المنشور');
      const fp=document.getElementById('mkt-panel-feed'); if(fp&&fp.classList.contains('active')) loadFeed(true);
    } catch(e){toast('حدث خطأ');}
    if(btn)btn.disabled=false;
  },

  openEdit() {
    const p=S.profile; const m=document.getElementById('soc-em'); if(!m||!p)return;
    document.getElementById('soc-en').value=p.displayName||'';
    document.getElementById('soc-eu').value=p.username||'';
    document.getElementById('soc-ef').value=p.farmName||'';
    document.getElementById('soc-eb').value=p.bio||'';
    document.getElementById('soc-el').value=p.location||'';
    m.classList.add('open');
  },
  closeEdit() { const m=document.getElementById('soc-em'); if(m)m.classList.remove('open'); },

  async saveProfile() {
    const db=getDB(); if(!S.uid||!db)return;
    const btn=document.getElementById('soc-esb'); if(btn)btn.disabled=true;
    try {
      const u={
        displayName:document.getElementById('soc-en').value.trim(),
        username:document.getElementById('soc-eu').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,''),
        farmName:document.getElementById('soc-ef').value.trim(),
        bio:document.getElementById('soc-eb').value.trim(),
        location:document.getElementById('soc-el').value.trim(),
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('social_profiles').doc(S.uid).update(u);
      S.profile={...S.profile,...u};
      invalidateProfileCache(S.uid);
      _profileCache[S.uid] = S.profile;
      this.closeEdit(); toast('✅ تم حفظ التغييرات');
      renderProfile(S.uid, true);
    }catch(e){toast('حدث خطأ');}
    if(btn)btn.disabled=false;
  },

  lb(url) { const lb=document.getElementById('soc-lb'); const img=document.getElementById('soc-lb-img'); if(!lb||!img)return; img.src=url; lb.classList.add('open'); },
  closeLb() { const lb=document.getElementById('soc-lb'); if(lb)lb.classList.remove('open'); },
  soon() { toast('📷 هذه الميزة قريباً'); },

  async uploadImg(e, type) {
    if (!S.uid) { toast('سجّل الدخول أولاً'); return; }
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('يُرجى اختيار صورة صالحة'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('الصورة أكبر من 10MB'); return; }

    const isAvatar = (type === 'avatar');
    const fieldKey = isAvatar ? 'photoURL' : 'coverURL';

    // Show local preview immediately (Optimistic UI)
    const localURL = URL.createObjectURL(file);
    if (isAvatar) {
      const avatarEl = document.querySelector('.soc-avatar-xl');
      if (avatarEl) {
        avatarEl.style.background = 'transparent';
        avatarEl.innerHTML = `<img src="${localURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
    } else {
      const cover = document.querySelector('.soc-profile-cover');
      if (cover) cover.style.backgroundImage = `url('${localURL}')`;
    }

    const input = document.getElementById(isAvatar ? 'soc-avatar-input' : 'soc-cover-input');
    if (input) input.disabled = true;
    toast('⏳ جاري معالجة الصورة...');

    try {
      // ── Compress image using Canvas ──────────────────────────
      const dataURL = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxW = isAvatar ? 400 : 1200;
          const maxH = isAvatar ? 400 : 400;
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', isAvatar ? 0.82 : 0.75));
        };
        img.onerror = reject;
        img.src = localURL;
      });
      URL.revokeObjectURL(localURL);

      toast('⏳ جاري الحفظ...');

      // ── Try Firebase Storage first ───────────────────────────
      let finalURL = dataURL; // fallback: store as base64 in Firestore
      const stor = window.storage;
      if (stor) {
        try {
          const path = `profile_photos/${S.uid}/${isAvatar ? 'avatar' : 'cover'}_${Date.now()}`;
          const storRef = stor.ref(path);
          // Convert dataURL back to blob for smaller storage transfer
          const res = await fetch(dataURL);
          const blob = await res.blob();
          const uploadTask = storRef.put(blob, { contentType: 'image/jpeg' });
          const storageURL = await new Promise((res, rej) => {
            uploadTask.on('state_changed',
              snap => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                toast(`⏳ جاري الرفع ${pct}%`);
              },
              err => rej(err),
              async () => {
                try { res(await uploadTask.snapshot.ref.getDownloadURL()); }
                catch(e) { rej(e); }
              }
            );
          });
          finalURL = storageURL; // Use Storage URL if succeeded
        } catch(storErr) {
          console.warn('Storage upload failed, using base64 fallback:', storErr.code);
          // finalURL stays as dataURL (base64 in Firestore)
        }
      }

      // ── Save URL to Firestore ────────────────────────────────
      const db = getDB();
      if (!db) throw new Error('db unavailable');
      await db.collection('social_profiles').doc(S.uid).set(
        { [fieldKey]: finalURL },
        { merge: true }
      );

      // Update local state + cache
      S.profile = { ...(S.profile || {}), [fieldKey]: finalURL };
      _profileCache[S.uid] = S.profile;

      // Update UI with final URL
      if (isAvatar) {
        const avatarEl = document.querySelector('.soc-avatar-xl');
        if (avatarEl) {
          avatarEl.innerHTML = `<img src="${finalURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        }
      } else {
        const cover = document.querySelector('.soc-profile-cover');
        if (cover) cover.style.backgroundImage = `url('${finalURL}')`;
      }

      toast('✅ تم تغيير الصورة بنجاح');
    } catch (err) {
      console.error('uploadImg final error:', err.code, err.message);
      toast('حدث خطأ: ' + (err.code || err.message || 'غير معروف'));
      if (S.uid) renderProfile(S.uid, true);
    } finally {
      if (input) { input.disabled = false; input.value = ''; }
    }
  },

  followers(uid) { switchPanel('followers'); waitForAuth().then(()=>renderFollowers(uid)); },
  following(uid) { switchPanel('following'); waitForAuth().then(()=>renderFollowing(uid)); },
  backProfile() { this.profile(S.profileUid); },

  async loadSocialNotifications() {
    const db=getDB(); const uid=S.uid; if(!db||!uid)return;
    const snap=await db.collection('social_notifications').where('toUid','==',uid).limit(20).get();
    const existing=document.getElementById('mkt-notif-list-page'); if(!existing||snap.empty)return;
    const prev=document.getElementById('soc-sn'); if(prev)prev.remove();
    const fromUids=[...new Set(snap.docs.map(d=>d.data().fromUid))];
    const fpm={}; await Promise.all(fromUids.map(async u=>{fpm[u]=await getProfile(u);}));
    const icons={follow:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,like:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,comment:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`};
    const msgs={follow:n=>`<strong>${n}</strong> بدأ في متابعة صفحتك`,like:n=>`<strong>${n}</strong> أعجب بمنشورك`,comment:n=>`<strong>${n}</strong> علّق على منشورك`};
    const sec=document.createElement('div'); sec.id='soc-sn';
    sec.innerHTML=`<div style="padding:9px 16px;font-size:10.5px;font-weight:900;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--line);">إشعارات اجتماعية</div>`+snap.docs.map(doc=>{const n=doc.data(),fp=fpm[n.fromUid]||{displayName:'مستخدم'},t=n.type||'follow';return`<div class="soc-notif-item ${n.read?'':'unread'}" onclick="SOCIAL.profile('${n.fromUid}')"><div class="soc-notif-icon ${t}">${icons[t]||icons.follow}</div><div><div class="soc-notif-text">${(msgs[t]||msgs.follow)(fp.displayName||'مستخدم')}</div><div class="soc-notif-time">${rel(n.createdAt)}</div></div>${av(fp,'soc-avatar-sm')}</div>`;}).join('');
    existing.appendChild(sec);
    snap.docs.filter(d=>!d.data().read).forEach(d=>d.ref.update({read:true}));
  },

  // aliases for onclick handlers in HTML
  showPanel(n) { this.show(n); },
  showMyProfile() { this.show('profile-me'); },
  showUserProfile(uid) { this.profile(uid); },
  openCreatePostModal() { this.openPost(); },
  openEditProfile() { this.openEdit(); },
  openLightbox(url) { this.lb(url); },
  closeLightbox() { this.closeLb(); },
};

/* ─── BOOT ─────────────────────────────────────────────────────*/
function boot() {
  injectGlobal();
  // Wait for firebase to be available before init
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    SOCIAL.init();
  } else {
    // Firebase not ready yet, wait
    setTimeout(boot, 300);
  }
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

document.addEventListener('click', e=>{
  if (e.target.closest('#mkt-tab-notif')) setTimeout(()=>SOCIAL.loadSocialNotifications(), 450);
});

})();
