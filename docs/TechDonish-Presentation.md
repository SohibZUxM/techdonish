# TechDonish Presentation

## Slide 1 - TechDonish Overview

![TechDonish Icon](../assets/icon.png)

**TechDonish** is a role-based education app that connects **students**, **teachers**, and **parents** in one platform.

### Vision
- Make school data easy to access from mobile and web
- Keep everyone connected with realtime updates
- Provide role-specific tools for each user type

### Platform and Stack
- Expo + React Native + TypeScript
- Firebase Authentication for sign-in
- Firestore for realtime database
- Firebase Storage for files/resources

---

## Slide 2 - How the App Works

![Welcome Hero](https://images.pexels.com/photos/1181395/pexels-photo-1181395.jpeg?auto=compress&cs=tinysrgb&w=1200)

### User Flow
1. User chooses role (Student / Teacher / Parent)
2. Signs in using Firebase Authentication
3. App loads user profile from Firestore `users`
4. If `status = active`, user is routed to their role dashboard

### Core Firestore Collections
- `users`: role, status, profile, linked children
- `courses`, `classes`, `enrollments`
- `grades`, `attendance`
- `classSessions`, `resources`, `exams`

### Realtime Experience
- Data listeners update the UI instantly
- Dashboards reflect new grades, attendance, and resources without manual refresh

---

## Slide 3 - Main Functions by Role

![TechDonish Web Icon](../public/icon-512.png)

### Student Functions
- View enrolled classes and course details
- Track grades, average score, and attendance
- Check schedule and open resources

### Teacher Functions
- Manage classes and students
- Create exams and record grades
- Share links/files as resources
- Schedule class sessions

### Parent Functions
- Monitor linked children progress
- See attendance and performance snapshots
- View updates, sessions, and resources

### Demo Accounts (for presentation)
- Student: `student.demo@techdonish.app` / `Demo@12345`
- Teacher: `teacher.demo@techdonish.app` / `Demo@12345`
- Parent: `parent.demo@techdonish.app` / `Demo@12345`

---

## Optional: Add Real App Screenshots

For stronger presentation visuals, insert screenshots from:
- Welcome screen
- Student dashboard metrics
- Teacher actions page
- Parent children/attendance pages

You can add them under each slide using:

```md
![Student Dashboard](../docs/images/student-dashboard.png)
```

