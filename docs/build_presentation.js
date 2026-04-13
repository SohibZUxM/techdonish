const pptxgen = require("C:\\Users\\s3d city\\AppData\\Roaming\\npm\\node_modules\\pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "TechDonish — Mobile Education Platform";
pres.author = "TechDonish";

// ── Color palette ──────────────────────────────────────────
const C = {
  navy:    "0F2150",   // slide 1 & 3 dark bg
  blue:    "2563EB",   // primary accent
  skyBlue: "3B82F6",   // lighter blue
  ice:     "DBEAFE",   // very light blue
  white:   "FFFFFF",
  offWhite:"F8FAFF",
  text:    "1E293B",
  muted:   "64748B",
  card:    "FFFFFF",
  s_color: "10B981",   // student - emerald
  t_color: "F59E0B",   // teacher  - amber
  p_color: "8B5CF6",   // parent   - violet
  a_color: "EF4444",   // admin    - red
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.10,
});

// ════════════════════════════════════════════════════════════
//  SLIDE 1 — Overview & Vision
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Left accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.32, h: 5.625,
    fill: { color: C.blue }, line: { color: C.blue },
  });

  // Decorative top-right block
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.8, y: 0, w: 2.2, h: 1.3,
    fill: { color: "142966" }, line: { color: "142966" },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 8.6, y: 1.3, w: 1.4, h: 0.9,
    fill: { color: "0D1F52" }, line: { color: "0D1F52" },
  });

  // App name label
  s.addText("MOBILE EDUCATION PLATFORM", {
    x: 0.55, y: 0.38, w: 7, h: 0.35,
    fontSize: 11, fontFace: "Calibri", bold: true,
    color: "93C5FD", charSpacing: 4, margin: 0,
  });

  // Main title
  s.addText("TechDonish", {
    x: 0.55, y: 0.72, w: 9, h: 1.2,
    fontSize: 56, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });

  // Tagline
  s.addText("Connecting Students, Teachers, Parents & Admins\nin one real-time platform.", {
    x: 0.55, y: 1.85, w: 6.8, h: 0.8,
    fontSize: 16, fontFace: "Calibri",
    color: "BFDBFE", margin: 0,
  });

  // Divider line
  s.addShape(pres.shapes.LINE, {
    x: 0.55, y: 2.7, w: 8.8, h: 0,
    line: { color: "1D3A78", width: 1.2 },
  });

  // 4 stat boxes
  const stats = [
    { val: "4",       lbl: "User Roles"     },
    { val: "v1.0.0",  lbl: "Version"        },
    { val: "Firebase",lbl: "Backend"        },
    { val: "iOS · Android\n· Web", lbl: "Platforms" },
  ];
  const boxW = 2.0, boxH = 1.25, startX = 0.55, startY = 2.9, gap = 0.2;
  stats.forEach((st, i) => {
    const x = startX + i * (boxW + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: startY, w: boxW, h: boxH,
      fill: { color: "162D6E" }, line: { color: "1E3A8A" },
    });
    // Accent top border
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: startY, w: boxW, h: 0.055,
      fill: { color: C.blue }, line: { color: C.blue },
    });
    s.addText(st.val, {
      x: x + 0.05, y: startY + 0.1, w: boxW - 0.1, h: 0.6,
      fontSize: 18, fontFace: "Georgia", bold: true,
      color: C.white, align: "center", margin: 0,
    });
    s.addText(st.lbl, {
      x: x + 0.05, y: startY + 0.68, w: boxW - 0.1, h: 0.4,
      fontSize: 11, fontFace: "Calibri",
      color: "93C5FD", align: "center", margin: 0,
    });
  });

  // Bottom summary bullets
  const bullets = [
    "Built with React Native 0.83 + Expo ~55 + TypeScript",
    "Firebase Auth, Firestore & Storage — fully cloud-based",
    "Real-time data sync across all users with zero manual refresh",
  ];
  bullets.forEach((b, i) => {
    const y = 4.3 + i * 0.38;
    s.addShape(pres.shapes.OVAL, {
      x: 0.55, y: y + 0.09, w: 0.13, h: 0.13,
      fill: { color: C.blue }, line: { color: C.blue },
    });
    s.addText(b, {
      x: 0.78, y, w: 8.6, h: 0.34,
      fontSize: 13, fontFace: "Calibri",
      color: "BFDBFE", margin: 0,
    });
  });

  // Slide number
  s.addText("01", {
    x: 9.2, y: 5.2, w: 0.6, h: 0.3,
    fontSize: 11, fontFace: "Calibri", color: "1D3A78",
    align: "right", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════
//  SLIDE 2 — Role-Based Features
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  // Header strip
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.05,
    fill: { color: C.navy }, line: { color: C.navy },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.32, h: 1.05,
    fill: { color: C.blue }, line: { color: C.blue },
  });
  s.addText("ROLE-BASED FEATURES", {
    x: 0.55, y: 0.1, w: 9, h: 0.4,
    fontSize: 11, fontFace: "Calibri", bold: true,
    color: "93C5FD", charSpacing: 3, margin: 0,
  });
  s.addText("What each user can do", {
    x: 0.55, y: 0.5, w: 9, h: 0.42,
    fontSize: 22, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });

  // Role cards — 2 × 2 grid
  const roles = [
    {
      title: "Student",
      color: C.s_color,
      items: [
        "View enrolled classes & course details",
        "Track grades, GPA & attendance records",
        "Access teacher-shared resources & files",
        "Check class schedule & upcoming sessions",
      ],
    },
    {
      title: "Teacher",
      color: C.t_color,
      items: [
        "Manage assigned classes & gradebook",
        "Create exams & record student grades",
        "Share resources (links / documents)",
        "Schedule sessions & track attendance",
      ],
    },
    {
      title: "Parent",
      color: C.p_color,
      items: [
        "Monitor children's academic progress",
        "View attendance records & grade reports",
        "Access shared class resources",
        "Receive session & activity updates",
      ],
    },
    {
      title: "Admin",
      color: C.a_color,
      items: [
        "Create & manage courses and classes",
        "Assign teachers to classes",
        "Approve user accounts & enrollments",
        "Link parent accounts to students",
      ],
    },
  ];

  const cardW = 4.5, cardH = 2.0;
  const positions = [
    { x: 0.3,  y: 1.2  },
    { x: 5.15, y: 1.2  },
    { x: 0.3,  y: 3.35 },
    { x: 5.15, y: 3.35 },
  ];

  roles.forEach((role, i) => {
    const { x, y } = positions[i];

    // Card background
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: C.white },
      line: { color: "E2E8F0", width: 1 },
      shadow: makeShadow(),
    });

    // Left color bar
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.22, h: cardH,
      fill: { color: role.color }, line: { color: role.color },
    });

    // Role title badge
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.32, y: y + 0.12, w: 0.88, h: 0.32,
      fill: { color: role.color }, line: { color: role.color },
    });
    s.addText(role.title.toUpperCase(), {
      x: x + 0.32, y: y + 0.12, w: 0.88, h: 0.32,
      fontSize: 9, fontFace: "Calibri", bold: true,
      color: C.white, align: "center", valign: "middle", margin: 0,
    });

    // Bullet items
    const bulletItems = role.items.map((item, idx) => ({
      text: item,
      options: {
        bullet: true,
        breakLine: idx < role.items.length - 1,
        fontSize: 11,
        fontFace: "Calibri",
        color: C.text,
        paraSpaceAfter: 2,
      },
    }));
    s.addText(bulletItems, {
      x: x + 0.32, y: y + 0.52, w: cardW - 0.42, h: cardH - 0.62,
      margin: 0,
    });
  });

  // Footer
  s.addShape(pres.shapes.LINE, {
    x: 0.3, y: 5.35, w: 9.4, h: 0,
    line: { color: "CBD5E1", width: 0.8 },
  });
  s.addText("Every role gets its own dashboard, navigation tabs, and dedicated data views.", {
    x: 0.3, y: 5.38, w: 8.5, h: 0.22,
    fontSize: 10, fontFace: "Calibri", color: C.muted, italic: true, margin: 0,
  });
  s.addText("02", {
    x: 9.2, y: 5.38, w: 0.6, h: 0.22,
    fontSize: 10, fontFace: "Calibri", color: C.muted, align: "right", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════
//  SLIDE 3 — Technical Architecture
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Left accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.32, h: 5.625,
    fill: { color: C.blue }, line: { color: C.blue },
  });

  // Title section
  s.addText("HOW IT WORKS", {
    x: 0.55, y: 0.18, w: 9, h: 0.35,
    fontSize: 11, fontFace: "Calibri", bold: true,
    color: "93C5FD", charSpacing: 4, margin: 0,
  });
  s.addText("Technical Architecture", {
    x: 0.55, y: 0.5, w: 9, h: 0.72,
    fontSize: 36, fontFace: "Georgia", bold: true,
    color: C.white, margin: 0,
  });

  // Divider
  s.addShape(pres.shapes.LINE, {
    x: 0.55, y: 1.28, w: 9.1, h: 0,
    line: { color: "1D3A78", width: 1 },
  });

  // ── Left column: 3 info cards ──────────────────────────
  const cards = [
    {
      label: "TECH STACK",
      color: C.blue,
      lines: [
        "React Native 0.83 · Expo ~55 · TypeScript",
        "Firebase v12  (Auth · Firestore · Storage)",
        "React Navigation · Expo Vector Icons",
      ],
    },
    {
      label: "AUTH & SECURITY",
      color: "10B981",
      lines: [
        "Email / password sign-up & sign-in",
        "Status flow:  pending → active → disabled",
        "Admin approval gate for new accounts",
      ],
    },
    {
      label: "DATA MODEL",
      color: "F59E0B",
      lines: [
        "Firestore collections: users, courses, classes,",
        "enrollments, grades, attendance,",
        "classSessions, resources, exams",
      ],
    },
  ];

  cards.forEach((card, i) => {
    const cy = 1.42 + i * 1.37;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: cy, w: 5.6, h: 1.22,
      fill: { color: "0D1D4F" }, line: { color: "1A2F6A" },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.55, y: cy, w: 5.6, h: 0.04,
      fill: { color: card.color }, line: { color: card.color },
    });
    s.addText(card.label, {
      x: 0.65, y: cy + 0.06, w: 5.4, h: 0.28,
      fontSize: 9, fontFace: "Calibri", bold: true,
      color: card.color, charSpacing: 2, margin: 0,
    });
    const lineItems = card.lines.map((l, idx) => ({
      text: l,
      options: { breakLine: idx < card.lines.length - 1, fontSize: 11, fontFace: "Calibri", color: "BFDBFE" },
    }));
    s.addText(lineItems, {
      x: 0.65, y: cy + 0.36, w: 5.4, h: 0.8, margin: 0,
    });
  });

  // ── Right column: screen flow + realtime ───────────────
  const rx = 6.5;

  // Real-time section
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 1.42, w: 3.2, h: 1.62,
    fill: { color: "0D1D4F" }, line: { color: "1A2F6A" },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 1.42, w: 3.2, h: 0.04,
    fill: { color: "8B5CF6" }, line: { color: "8B5CF6" },
  });
  s.addText("REAL-TIME HOOKS", {
    x: rx + 0.1, y: 1.48, w: 3.0, h: 0.28,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: "A78BFA", charSpacing: 2, margin: 0,
  });
  const hookItems = [
    { text: "useRealtimeList", options: { bullet: true, breakLine: true, fontSize: 10, fontFace: "Consolas", color: "C4B5FD" } },
    { text: "useRealtimeDocsByIds", options: { bullet: true, breakLine: true, fontSize: 10, fontFace: "Consolas", color: "C4B5FD" } },
    { text: "useRealtimeWhereIn", options: { bullet: true, fontSize: 10, fontFace: "Consolas", color: "C4B5FD" } },
  ];
  s.addText(hookItems, { x: rx + 0.1, y: 1.8, w: 3.0, h: 0.7, margin: 0 });
  s.addText("Firebase onSnapshot listeners — zero manual refresh", {
    x: rx + 0.1, y: 2.56, w: 3.0, h: 0.38,
    fontSize: 9.5, fontFace: "Calibri", color: "93C5FD", italic: true, margin: 0,
  });

  // Screen flow section
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 3.18, w: 3.2, h: 2.22,
    fill: { color: "0D1D4F" }, line: { color: "1A2F6A" },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 3.18, w: 3.2, h: 0.04,
    fill: { color: "EF4444" }, line: { color: "EF4444" },
  });
  s.addText("SCREEN FLOW", {
    x: rx + 0.1, y: 3.24, w: 3.0, h: 0.28,
    fontSize: 9, fontFace: "Calibri", bold: true,
    color: "FCA5A5", charSpacing: 2, margin: 0,
  });
  const flowSteps = [
    "BootScreen",
    "WelcomeScreen",
    "RoleAuthScreen",
    "PendingApproval  (if needed)",
    "Role Dashboard (Student / Teacher\n/ Parent / Admin Tabs)",
  ];
  flowSteps.forEach((step, i) => {
    const fy = 3.58 + i * 0.36;
    // Arrow / bullet dot
    s.addShape(pres.shapes.OVAL, {
      x: rx + 0.08, y: fy + 0.07, w: 0.11, h: 0.11,
      fill: { color: "EF4444" }, line: { color: "EF4444" },
    });
    // Connector line to next
    if (i < flowSteps.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: rx + 0.125, y: fy + 0.18, w: 0, h: 0.25,
        line: { color: "EF4444", width: 1 },
      });
    }
    s.addText(step, {
      x: rx + 0.27, y: fy, w: 2.8, h: i === 4 ? 0.52 : 0.3,
      fontSize: 10.5, fontFace: "Calibri", color: "BFDBFE", margin: 0,
    });
  });

  // Slide number
  s.addText("03", {
    x: 9.2, y: 5.3, w: 0.6, h: 0.22,
    fontSize: 10, fontFace: "Calibri", color: "1D3A78", align: "right", margin: 0,
  });
}

// ── Write file ─────────────────────────────────────────────
const outPath = "C:\\Users\\s3d city\\Desktop\\Projects\\Applications\\Original\\TechDonish\\docs\\TechDonish_Presentation.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("✅  Saved:", outPath);
}).catch(err => {
  console.error("❌ Error:", err);
});
