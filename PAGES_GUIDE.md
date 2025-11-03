# Multi-Page 3D Scene Setup - Quick Reference

This guide helps you understand and modify the three-page setup.

## File Structure Overview

```
Each page has THREE associated files:

/page1:
  ├── 3D Scene:  src/components/scenes/Scene1.tsx
  ├── Page:      src/app/page1/page.tsx
  └── Styles:    src/styles/page1.module.css

/page2:
  ├── 3D Scene:  src/components/scenes/Scene2.tsx
  ├── Page:      src/app/page2/page.tsx
  └── Styles:    src/styles/page2.module.css

/page3:
  ├── 3D Scene:  src/components/scenes/Scene3.tsx
  ├── Page:      src/app/page3/page.tsx
  └── Styles:    src/styles/page3.module.css
```

## How to Modify Each Scene

### 1. Change the 3D Objects and Animations

Edit `src/components/scenes/SceneX.tsx`:

```typescript
// Add a new rotating cube
function RotatingCube() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Box ref={meshRef} args={[2, 2, 2]}>
      <meshStandardMaterial color="#ff0000" />
    </Box>
  );
}
```

Then add it to the Canvas:
```typescript
<RotatingCube />
```

### 2. Change the Page Title and Subtitle

Edit `src/app/pageX/page.tsx`:

```typescript
<div className={styles.header}>
  <h1 className={styles.title}>Your New Title</h1>
  <p className={styles.subtitle}>Your new subtitle</p>
</div>
```

### 3. Change the Page Styling

Edit `src/styles/pageX.module.css`:

```css
.header {
  background: linear-gradient(to bottom, rgba(255, 0, 0, 0.6), transparent);
  /* Modify colors and styling */
}

.title {
  font-size: 3rem;
  color: #ffffff;
  /* Customize title */
}

.navButton {
  border-color: #ff0000;
  /* Customize buttons */
}
```

## Useful 3D Shapes from @react-three/drei

Import and use in your Scene components:

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
  Plane,
  Cylinder,
  Tube,
  Text,
  Stars,
  OrbitControls
} from '@react-three/drei';
```

## Modify Background Gradient

In each Scene component, change the Canvas background:

```typescript
<Canvas
  style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
>
```

Gradient patterns:
- `linear-gradient(to bottom, color1, color2)`
- `linear-gradient(135deg, color1, color2)`
- `radial-gradient(circle, color1, color2)`

## Add Lighting

Adjust lighting in each Scene:

```typescript
<ambientLight intensity={0.5} />              {/* Overall light */}
<directionalLight position={[10, 10, 5]} intensity={1} />  {/* Sun-like */}
<pointLight position={[0, 0, 10]} intensity={0.8} color="#ff0000" />  {/* Colored spot */}
```

## Navigation Between Pages

The navigation is built into each page's footer. To add more pages:

1. Create `src/app/page4/page.tsx`
2. Create `src/components/scenes/Scene4.tsx`
3. Create `src/styles/page4.module.css`
4. Add new Link buttons in each page's navBar

## Common Customizations

### Change Page Background Color (Canvas)
Edit the style prop in `<Canvas>`

### Change Header Color
Edit `.header` in the corresponding CSS module

### Change Button Styling
Edit `.navButton` and `.navButton:hover` in the CSS module

### Change Camera Position
Edit the `camera` prop in `<Canvas>`:
```typescript
camera={{ position: [0, 0, 10], fov: 75 }}
```

### Make Objects Rotate
Use `useFrame` hook:
```typescript
useFrame(() => {
  if (meshRef.current) {
    meshRef.current.rotation.x += 0.01;
  }
});
```

## Tips for 3D Customization

- **Colors**: Use hex codes like `#ff0000` or CSS color names like `red`
- **Positions**: `[x, y, z]` coordinates
- **Sizes**: `args={[width, height, depth]}` for Box, `args={[radius]` for Sphere
- **Materials**: `meshStandardMaterial` is versatile, try `meshPhongMaterial` or `meshBasicMaterial`
- **Wireframe**: Add `wireframe={true}` to see the geometry

## Testing Your Changes

After modifying files:
```bash
npm run dev
```

Visit `http://localhost:3000` and navigate to the page you modified. Changes will hot-reload!

