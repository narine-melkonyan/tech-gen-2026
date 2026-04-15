(() => {
    const GREEN = '#1a5c35';
    const lessons = [
        { label: 'Lesson 1 — SDLC & STLC',            href: '/Lesson 1_ SDLC and STLC.html' },
        { label: 'Lesson 8 — DB Testing',              href: '/client-server.html' },
    ];

    const current = window.location.pathname.split('/').pop();

    const nav = lessons.map(l => {
        const active = decodeURIComponent(current) === decodeURIComponent(l.href.replace('/', ''));
        return `<a href="${l.href}" style="
      text-decoration: none;
      font-size: 13px;
      font-family: Arial, sans-serif;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1.5px solid ${active ? '#fff' : 'rgba(255,255,255,0.35)'};
      background: ${active ? 'rgba(255,255,255,0.18)' : 'transparent'};
      color: #fff;
      font-weight: ${active ? '700' : '400'};
      white-space: nowrap;
      transition: background 0.2s;
    ">${l.label}</a>`;
    }).join('');

    const html = `
    <header style="
      background: ${GREEN};
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      position: sticky;
      top: 0;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      flex-wrap: wrap;
      gap: 8px;
    ">
      <a href="/" style="text-decoration:none; display:flex; align-items:center; gap:10px;">
        <div style="width:8px; height:8px; border-radius:50%; background:#fff; opacity:0.8;"></div>
        <span style="color:#fff; font-family: Georgia, serif; font-size:15px; font-weight:700; letter-spacing:0.3px;">
          QA Internship
        </span>
      </a>
      <nav style="display:flex; gap:8px; flex-wrap:wrap;">
        ${nav}
      </nav>
    </header>
  `;

    document.body.insertAdjacentHTML('afterbegin', html);
    document.body.style.margin = '0';
})();