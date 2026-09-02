# GoaMoments ERP - Attendance System

A web-based ERP Attendance Management System built with Next.js, TypeScript, and Firebase Firestore.

## Project Overview

GoaMoments ERP is an internal ERP application designed to manage employees, departments, tasks, attendance, authentication, and related business operations.

The attendance module uses Firebase Firestore for storing and managing attendance records.

## Features

- User authentication
- Employee management
- Department management
- Attendance management
- Clock In / Clock Out
- Late arrival tracking
- Early exit tracking
- Attendance history
- Attendance corrections
- Task management
- Role-based access
- Manager and MD administration
- Firebase Firestore database
- Secure server-side Firebase Admin SDK integration

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- CSS

### Backend

- Next.js API Routes
- Firebase Admin SDK

### Database

- Firebase Firestore

### Development Tools

- Node.js
- npm
- Git
- GitHub
- Firebase CLI

## Project Structure

```text
Goamoments-ERP-attendance-firebase/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   └── erp/
│   ├── chatgpt-auth.ts
│   ├── erp-app.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── db/
│   ├── erp.ts
│   └── index.ts
│
├── public/
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── apphosting.yaml
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── .gitignore
