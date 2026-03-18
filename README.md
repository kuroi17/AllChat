# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

# BSU AllChat MVP

A modern campus chat and info platform built with React, Tailwind CSS, Supabase, and Vite. This project is designed for BSU students to connect, chat, and stay updated with campus events and announcements.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Supabase (BaaS, Auth, Realtime, Storage)
- **Deployment:** Vercel (Frontend), Supabase (Backend)

## MVP Features

- Global Chat (real-time messaging)
- Direct Messages (DM)
- Mobile-first responsive design
- Hamburger menu for mobile navigation
- Info panel in DM (follow/unfollow, view profile, shared media)
- Sidebar with campus info (static for MVP)
- User authentication (via Supabase)

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/<your-username>/bsuAllChat.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Supabase:
   - Create a Supabase project
   - Add your Supabase keys to `.env` (see `.env.example`)
4. Run locally:
   ```bash
   npm run dev
   ```

## Deployment

- Frontend: Deploy to Vercel (or Render)
- Backend: Supabase project (no server needed for MVP)

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Release Notes: MVP Phase

- Initial release with core chat and info features
- Mobile navigation and responsive UI
- Separate commits for each major feature

## License

MIT
