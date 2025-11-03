'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Cone, Icosahedron } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

function RotatingCone() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <Cone ref={meshRef} args={[1, 2, 32]} position={[-2, 0, 0]}>
      <meshStandardMaterial color="#ffd700" />
    </Cone>
  );
}

function RotatingIcosahedron() {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <Icosahedron ref={meshRef} args={[1, 4]} position={[2, 0, 0]}>
      <meshStandardMaterial color="#ff1493" wireframe={false} />
    </Icosahedron>
  );
}

export default function Scene3() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 75 }}
      style={{ background: 'linear-gradient(to right, #667eea 0%, #764ba2 100%)' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[0, 10, 0]} intensity={0.8} color="#ffd700" />
      
      <RotatingCone />
      <RotatingIcosahedron />
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

