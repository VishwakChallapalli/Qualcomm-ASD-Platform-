# Project Structure & Files Guide

## Complete File Structure

```
website/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home - redirects to /page1
│   │   ├── layout.tsx                  # Root layout wrapper
│   │   ├── globals.css                 # Global styles
│   │   ├── favicon.ico
│   │   │
│   │   ├── page1/
│   │   │   └── page.tsx                # Scene 1 page component
│   │   │
│   │   ├── page2/
│   │   │   └── page.tsx                # Scene 2 page component
│   │   │
│   │   └── page3/
│   │       └── page.tsx                # Scene 3 page component
│   │
│   ├── components/
│   │   ├── Scene.tsx                   # Legacy single scene (can be removed)
│   │   │
│   │   └── scenes/                     # Individual 3D scene components
│   │       ├── Scene1.tsx              # Cube & Sphere scene
│   │       ├── Scene2.tsx              # Wireframe Torus scene
│   │       └── Scene3.tsx              # Cone & Icosahedron scene
│   │
│   └── styles/                         # CSS Modules for each page
│       ├── page1.module.css            # Scene 1 styles (green/blue theme)
│       ├── page2.module.css            # Scene 2 styles (dark/cyan theme)
│       └── page3.module.css            # Scene 3 styles (purple theme)
│
├── public/                             # Static assets
│   ├── next.svg
│   ├── vercel.svg
│   └── ...
│
├── package.json                        # Dependencies
├── package-lock.json
├── tsconfig.json                       # TypeScript config
├── next.config.ts                      # Next.js config
├── tailwind.config.ts                  # Tailwind config
├── postcss.config.mjs                  # PostCSS config
├── eslint.config.mjs                   # ESLint config
├── README.md                           # Main documentation
├── PAGES_GUIDE.md                      # Quick reference for modifications
└── STRUCTURE.md                        # This file

```

## File Descriptions

### Application Entry Points

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Home page - redirects to `/page1` on mount |
| `src/app/layout.tsx` | Root layout - wraps all pages with global styling |
| `src/app/globals.css` | Global CSS - imported in layout |

### Page Components (Routes)

Each page is a separate route that displays a 3D scene:

| File | URL | Description |
|------|-----|-------------|
| `src/app/page1/page.tsx` | `/page1` | Scene 1 page with cube & sphere |
| `src/app/page2/page.tsx` | `/page2` | Scene 2 page with wireframe torus |
| `src/app/page3/page.tsx` | `/page3` | Scene 3 page with cone & icosahedron |

Each page file has this structure:
```typescript
export default function PageX() {
  return (
    <div className={styles.container}>
      <SceneX />                    {/* 3D Canvas */}
      <div className={styles.header}>    {/* Title overlay */}
        <h1>Title</h1>
      </div>
      <div className={styles.navBar}>    {/* Navigation buttons */}
        {/* Links to other pages */}
      </div>
    </div>
  );
}
```

### Scene Components (3D)

Located in `src/components/scenes/`, these contain the Three.js rendering:

| File | Content |
|------|---------|
| `Scene1.tsx` | Box and Sphere with basic lighting |
| `Scene2.tsx` | Two rotating wireframe Torus objects |
| `Scene3.tsx` | Cone and Icosahedron with animations |

Each scene component:
- Uses `<Canvas>` from React Three Fiber
- Contains 3D geometry functions
- Uses `useFrame` for animations
- Includes `OrbitControls` for user interaction

### Style Modules (CSS)

Each page has its own CSS module for isolated styling:

| File | Purpose |
|------|---------|
| `page1.module.css` | Styles for page 1 (green/blue theme) |
| `page2.module.css` | Styles for page 2 (dark/cyan theme) |
| `page3.module.css` | Styles for page 3 (purple theme) |

CSS Module classes available on all pages:
- `.container` - Main wrapper
- `.header` - Title/subtitle overlay
- `.title` - Main heading
- `.subtitle` - Secondary text
- `.navBar` - Navigation bar
- `.navButton` - Navigation buttons
- `.navButton:hover` - Button hover state

## Data Flow

```
User visits http://localhost:3000
        ↓
    page.tsx (redirects)
        ↓
    /page1/page.tsx (or page2 or page3)
        ↓
    Layout + Component + Styles
        ↓
    Scene1/2/3 component renders
        ↓
    Canvas with 3D objects
        ↓
    Interactive 3D scene displayed
```

## Customization Patterns

### Pattern 1: Add a new 3D object to Scene 1

1. Edit `src/components/scenes/Scene1.tsx`
2. Add new function with `useRef<Mesh>` and `useFrame`
3. Add component to Canvas in Scene1's return

```typescript
function MyNewObject() {
  const meshRef = useRef<Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
    }
  });
  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <meshStandardMaterial color="red" />
    </Sphere>
  );
}
```

### Pattern 2: Change page styling

1. Edit the corresponding CSS module in `src/styles/pageX.module.css`
2. Modify classes like `.title`, `.navButton`, etc.
3. Changes hot-reload in dev mode

### Pattern 3: Change page text

1. Edit `src/app/pageX/page.tsx`
2. Modify the text inside `<h1>` and `<p>` tags
3. Changes hot-reload in dev mode

## Adding a New Page (Page 4)

To add a 4th scene:

1. **Create scene**: `src/components/scenes/Scene4.tsx`
2. **Create styles**: `src/styles/page4.module.css`
3. **Create page**: `src/app/page4/page.tsx`
4. **Update navigation**: Add link to page4 in all page components

## Environment & Tools

- **Next.js 16**: Framework (includes React 19)
- **TypeScript**: Type safety
- **React Three Fiber**: React wrapper for Three.js
- **drei**: Helper library for common 3D patterns
- **Tailwind CSS**: Utility-first styling (optional, already set up)
- **CSS Modules**: Scoped component styles
- **ESLint**: Code linting

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server (hot reload enabled)
npm run dev

# Visit http://localhost:3000

# Edit files and see changes instantly
# - src/components/scenes/SceneX.tsx → 3D changes
# - src/styles/pageX.module.css → Styling changes
# - src/app/pageX/page.tsx → Page content changes

# Build for production
npm run build

# Start production server
npm start
```

## Key Technologies

### React Three Fiber
- Renderer for Three.js
- Component-based 3D rendering
- `<Canvas>` - Main 3D rendering container
- `useFrame` - Animation loop hook
- `useRef` - Reference to mesh objects

### drei Library
- Pre-built 3D objects (Box, Sphere, Torus, etc.)
- `OrbitControls` - Camera interaction
- Lighting helpers
- Post-processing effects

### CSS Modules
- Locally scoped CSS
- Prevents naming conflicts
- Imported as objects in TSX

### Next.js App Router
- File-based routing
- `/page1` → `src/app/page1/page.tsx`
- Automatic code splitting
- Hot module replacement (HMR)

## Typical Modifications You'll Make

1. **3D Objects**: Edit `src/components/scenes/SceneX.tsx`
   - Add/remove 3D shapes
   - Change colors, sizes, positions
   - Add animations

2. **Page Theme**: Edit `src/styles/pageX.module.css`
   - Background colors/gradients
   - Button colors
   - Text styles

3. **Page Content**: Edit `src/app/pageX/page.tsx`
   - Title and subtitle text
   - Add more UI elements

4. **Lighting**: In Scene components
   - Adjust `ambientLight`, `directionalLight`, `pointLight`
   - Change intensities and positions

5. **Camera**: In Scene components
   - Adjust `camera={{ position: [x, y, z], fov: angle }}`

## Performance Tips

- Scenes load independently per page (no lag switching pages)
- Orbit controls are hardware-accelerated
- CSS Modules have no runtime overhead
- TypeScript catches errors at compile time


