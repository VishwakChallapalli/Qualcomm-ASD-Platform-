# 3D Website with Next.js 15 + React Three Fiber

A modern web application built with Next.js 15, React 19, TypeScript, and React Three Fiber featuring multiple interactive 3D scenes with separate pages, components, and styles.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with new features
- **TypeScript** - Type-safe JavaScript
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for React Three Fiber
- **Three.js** - 3D graphics library
- **Tailwind CSS** - Utility-first CSS framework
- **CSS Modules** - Scoped styling for each page



## Pages Overview
- First Wireframe : Title Page
- Second Page : Homepage

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. You'll be automatically redirected to Scene 1.

Navigate between scenes using the buttons at the bottom of each page.

## Project Structure to Begin Development

```
src/
├── app/
│   ├── page.tsx                    # Home page (redirects to page1)
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   ├── page1/
│   │   └── page.tsx               # Scene 1 page
│   ├── page2/
│   │   └── page.tsx               # Scene 2 page
│   └── page3/
│       └── page.tsx               # Scene 3 page
├── components/
│   ├── Scene.tsx                   # Legacy scene component
│   └── scenes/
│       ├── Scene1.tsx              # Scene 1 3D component
│       ├── Scene2.tsx              # Scene 2 3D component
│       └── Scene3.tsx              # Scene 3 3D component
└── styles/
    ├── page1.module.css            # Scene 1 styles
    ├── page2.module.css            # Scene 2 styles
    └── page3.module.css            # Scene 3 styles
```

## Customization Guide

### Modifying a Scene

To customize a 3D scene, edit the corresponding file in `src/components/scenes/`:

```typescript
// Example: Modifying Scene1.tsx
export default function Scene1() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ background: 'your-gradient-here' }}
    >
      {/* Add/modify 3D objects here */}
    </Canvas>
  );
}
```

### Customizing Page Styles

Each page has its own CSS module in `src/styles/`. Modify them independently:

```css
/* src/styles/page1.module.css */
.title {
  /* Customize title styling */
}

.navButton {
  /* Customize navigation buttons */
}
```

### Customizing Page Content

Update the text and layout in each page file:

```typescript
// src/app/page1/page.tsx
<h1 className={styles.title}>Your Custom Title</h1>
<p className={styles.subtitle}>Your custom subtitle</p>
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Adding a New Scene

To add a new scene:

1. Create a new component in `src/components/scenes/SceneX.tsx`
2. Create a new CSS module in `src/styles/pageX.module.css`
3. Create a new page directory `src/app/pageX/page.tsx`
4. Add a link to it in the navigation buttons

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Documentation](https://threejs.org/docs)
- [@react-three/drei Documentation](https://github.com/pmndrs/drei)
- [Drei Examples](https://drei.pmnd.rs/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.
