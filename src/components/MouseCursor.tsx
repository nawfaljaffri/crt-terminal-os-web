import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function MouseCursor({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()

  useFrame(({ pointer }) => {
    if (meshRef.current) {
      const mult = 1.15
      meshRef.current.position.x += (pointer.x * (viewport.width / 2) * mult - meshRef.current.position.x) * 0.4
      meshRef.current.position.y += (pointer.y * (viewport.height / 2) * mult - meshRef.current.position.y) * 0.4
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0.1]}>
      <planeGeometry args={[0.3, 0.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  )
}
