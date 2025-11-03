'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Torus } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

function RotatingTorus() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Torus ref={meshRef} args={[1, 0.4, 16, 100]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#ff6b9d" wireframe={true} />
    </Torus>
  );
}

function RotatingTorusTwo() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x -= 0.01;
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <Torus ref={meshRef} args={[1.5, 0.3, 16, 100]} position={[0, 0, 0]} scale={0.8}>
      <meshStandardMaterial color="#00d4ff" wireframe={true} />
    </Torus>
  );
}

export default function Scene2() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 75 }}
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d4ff" />
      
      <RotatingTorus />
      <RotatingTorusTwo />
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

