# Quick Start Guide 🚀

## 1. Start the Development Server

```bash
cd /Users/vishwakchallapalli/website
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You'll automatically be redirected to Scene 1.

## 2. Navigate Between Scenes

Use the navigation buttons at the bottom of each page:
- **Scene 1** - Cube & Sphere (green/blue theme)
- **Scene 2** - Wireframe Torus (dark/cyan theme)
- **Scene 3** - Cone & Icosahedron (purple theme)

## 3. Interact with 3D Objects

- **Rotate**: Click and drag
- **Zoom**: Scroll wheel
- **Pan**: Right-click and drag (or use keyboard shortcuts)

## 4. Make Your First Change

### Change Scene 1's Title

Edit `src/app/page1/page.tsx`:

```typescript
<h1 className={styles.title}>Your Custom Title Here</h1>
```

Save and watch the page update automatically! ✨

### Change Scene 1's 3D Colors

Edit `src/components/scenes/Scene1.tsx`:

```typescript
// Change the cube color
<Box ref={meshRef} args={[1, 1, 1]} position={[-1, 0, 0]}>
  <meshStandardMaterial color="blue" />  {/* Change to any color */}
</Box>

// Change the sphere color
<Sphere ref={meshRef} args={[0.5, 32, 32]} position={[1, 0, 0]}>
  <meshStandardMaterial color="yellow" />  {/* Change to any color */}
</Sphere>
```

### Change Page Background

Edit `src/components/scenes/Scene1.tsx`:

```typescript
<Canvas
  camera={{ position: [0, 0, 5], fov: 75 }}
  style={{ background: 'linear-gradient(to bottom, red, orange)' }}  {/* New gradient */}
>
```

### Change Theme Colors

Edit `src/styles/page1.module.css`:

```css
.header {
  background: linear-gradient(to bottom, rgba(255, 0, 0, 0.8), transparent);
  color: white;
}

.navButton {
  border: 2px solid white;
  background: rgba(255, 0, 0, 0.6);
  color: white;
}

.navButton:hover {
  background: white;
  color: red;
}
```

## File Quick Reference

| Task | Edit File |
|------|-----------|
| Change 3D objects | `src/components/scenes/SceneX.tsx` |
| Change page title/subtitle | `src/app/pageX/page.tsx` |
| Change colors/styling | `src/styles/pageX.module.css` |
| Change 3D object colors | `src/components/scenes/SceneX.tsx` (in material color prop) |
| Change background gradient | `src/components/scenes/SceneX.tsx` (Canvas style) |
| Change lighting | `src/components/scenes/SceneX.tsx` (ambientLight, directionalLight, pointLight) |

## Add a New 3D Object

In `src/components/scenes/Scene1.tsx` (or any scene), add:

```typescript
import { Cylinder } from '@react-three/drei';

function RotatingCylinder() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <Cylinder ref={meshRef} args={[0.5, 0.5, 2, 32]} position={[0, 2, 0]}>
      <meshStandardMaterial color="#ff00ff" />
    </Cylinder>
  );
}
```

Then add it to the Canvas:
```typescript
<RotatingCylinder />
```

## Available 3D Shapes

Import from `@react-three/drei`:

```typescript
import {
  Box,
  Sphere,
  Torus,
  Cone,
  Icosahedron,
  Octahedron,
  Tetrahedron,
  Dodecahedron,
  Cylinder,
  Plane,
  Tube
} from '@react-three/drei';
```

## Color Ideas

- Basic CSS: `'red'`, `'blue'`, `'green'`, `'yellow'`
- Hex codes: `'#ff0000'`, `'#00ff00'`, `'#0000ff'`
- RGB: `'rgb(255, 0, 0)'`, `'rgb(0, 255, 0)'`

## Gradient Ideas

```css
/* Horizontal gradient */
background: 'linear-gradient(to right, blue, red)'

/* Diagonal gradient */
background: 'linear-gradient(135deg, purple, orange)'

/* Radial gradient */
background: 'radial-gradient(circle, yellow, purple)'

/* Multi-color gradient */
background: 'linear-gradient(to bottom, red, yellow, green)'
```

## Hot Reload

Any file changes will automatically reload in the browser. No need to restart!

Changes that hot-reload:
- ✅ 3D object changes
- ✅ CSS styling
- ✅ Page text/titles
- ✅ Colors and gradients

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

**Black/blank screen?**
- Check browser console (F12) for errors
- Make sure the Canvas component is rendering
- Check if Scene import is correct

**3D objects not showing?**
- Verify material colors are visible
- Check camera position
- Ensure lighting is set up

**Styles not applying?**
- Make sure CSS module is imported correctly
- Check class names match in JSX
- Clear browser cache if needed

## Next Steps

1. Explore each scene file to understand how it works
2. Try modifying colors, shapes, and animations
3. Read `PAGES_GUIDE.md` for more detailed customization tips
4. Read `STRUCTURE.md` for complete project architecture

## Documentation

- 📖 [README.md](./README.md) - Project overview
- 📋 [PAGES_GUIDE.md](./PAGES_GUIDE.md) - Detailed modification guide
- 🗂️ [STRUCTURE.md](./STRUCTURE.md) - Project structure and architecture
- 🚀 [QUICK_START.md](./QUICK_START.md) - This file!

## Need Help?

Refer to the documentation in the project root:
- `README.md` - Overview and setup
- `PAGES_GUIDE.md` - How to modify scenes
- `STRUCTURE.md` - File structure details

Happy building! 🎉

