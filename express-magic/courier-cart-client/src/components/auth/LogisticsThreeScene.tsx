import { Box } from '@mui/material'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BRAND } from '../../config/brand'

const { teal, orange, paper } = BRAND.colors

type LogisticsThreeSceneProps = {
  compact?: boolean
}

function createRoute(points: THREE.Vector3[], color: string, opacity: number) {
  const curve = new THREE.CatmullRomCurve3(points)
  const route = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.012, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
  )

  return { curve, route }
}

function createShipmentBlock(color: string, accent: string) {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.34, 0.38),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.34,
      metalness: 0.06,
      clearcoat: 0.55,
      clearcoatRoughness: 0.32,
    }),
  )
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.052, 0.4),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.42, metalness: 0.02 }),
  )
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shell.geometry),
    new THREE.LineBasicMaterial({ color: paper, transparent: true, opacity: 0.42 }),
  )

  shell.castShadow = true
  shell.receiveShadow = true
  band.position.y = 0.04
  band.castShadow = true
  group.add(shell, band, edges)
  return group
}

function createNode(color: string) {
  const group = new THREE.Group()
  const node = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 32, 32),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.7,
      emissive: color,
      emissiveIntensity: 0.18,
    }),
  )
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.007, 10, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }),
  )

  halo.rotation.x = Math.PI / 2
  group.add(node, halo)
  return group
}

export default function LogisticsThreeScene({ compact = false }: LogisticsThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const clock = new THREE.Clock()
    const routeDots: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }> = []
    const shipmentBlocks: THREE.Group[] = []
    const nodes: THREE.Group[] = []

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    camera.position.set(compact ? 3.2 : 4.15, compact ? 2.3 : 2.8, compact ? 5.15 : 5.7)
    camera.lookAt(0.15, 0.42, 0)

    scene.add(new THREE.HemisphereLight('#FFFFFF', '#5C7899', 2.45))
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.15)
    keyLight.position.set(2.8, 4.5, 3.8)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight('#7FD8FF', 1.15)
    rimLight.position.set(-3, 2.4, -2.5)
    scene.add(rimLight)

    const stage = new THREE.Group()
    stage.scale.setScalar(compact ? 0.92 : 1)
    stage.position.set(compact ? 0.22 : 0, compact ? -0.18 : 0, 0)
    scene.add(stage)

    const hubMaterial = new THREE.MeshPhysicalMaterial({
      color: '#0D376B',
      roughness: 0.28,
      metalness: 0.16,
      clearcoat: 0.85,
      clearcoatRoughness: 0.2,
      transparent: true,
      opacity: 0.88,
    })
    const hub = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.68, 0.8), hubMaterial)
    hub.position.set(0.12, 0.58, 0.02)
    hub.rotation.y = -0.42
    hub.castShadow = true
    hub.receiveShadow = true
    stage.add(hub)
    const hubEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(hub.geometry),
      new THREE.LineBasicMaterial({ color: '#9FD6FF', transparent: true, opacity: 0.52 }),
    )
    hubEdges.position.copy(hub.position)
    hubEdges.rotation.copy(hub.rotation)
    stage.add(hubEdges)

    const orbitOne = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.009, 10, 128),
      new THREE.MeshBasicMaterial({ color: teal, transparent: true, opacity: 0.3 }),
    )
    orbitOne.rotation.set(Math.PI / 2.7, 0.1, -0.15)
    stage.add(orbitOne)

    const orbitTwo = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.006, 10, 128),
      new THREE.MeshBasicMaterial({ color: paper, transparent: true, opacity: 0.18 }),
    )
    orbitTwo.rotation.set(Math.PI / 2.15, -0.2, 0.38)
    stage.add(orbitTwo)

    const routes = [
      createRoute(
        [
          new THREE.Vector3(-2.15, 0.12, 0.9),
          new THREE.Vector3(-1.1, 0.66, 1.36),
          new THREE.Vector3(0.1, 0.9, 1.05),
          new THREE.Vector3(1.5, 0.62, 0.48),
          new THREE.Vector3(2.15, 0.2, -0.42),
        ],
        orange,
        0.78,
      ),
      createRoute(
        [
          new THREE.Vector3(-1.65, 0.24, -0.92),
          new THREE.Vector3(-0.76, 0.82, -1.22),
          new THREE.Vector3(0.52, 1.05, -0.86),
          new THREE.Vector3(1.85, 0.34, -0.82),
        ],
        '#7AD8FF',
        0.54,
      ),
    ]
    routes.forEach(({ route }) => stage.add(route))

    const nodePositions = [
      new THREE.Vector3(-2.15, 0.12, 0.9),
      new THREE.Vector3(2.15, 0.2, -0.42),
      new THREE.Vector3(-1.65, 0.24, -0.92),
      new THREE.Vector3(1.85, 0.34, -0.82),
      new THREE.Vector3(0.12, 1.02, 1.02),
    ]
    nodePositions.forEach((position, index) => {
      const node = createNode(index % 2 ? orange : teal)
      node.position.copy(position)
      nodes.push(node)
      stage.add(node)
    })

    routes.forEach(({ curve }, routeIndex) => {
      for (let index = 0; index < 4; index += 1) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.042, 18, 18),
          new THREE.MeshBasicMaterial({ color: routeIndex ? '#BDEBFF' : orange, transparent: true, opacity: 0.95 }),
        )
        routeDots.push({ mesh: dot, curve, offset: (index + routeIndex * 0.5) / 4 })
        stage.add(dot)
      }
    })

    const blockPositions = [
      new THREE.Vector3(-1.28, 0.45, 0.12),
      new THREE.Vector3(1.18, 0.5, 0.32),
      new THREE.Vector3(0.54, 1.35, -0.58),
    ]
    blockPositions.forEach((position, index) => {
      const block = createShipmentBlock(index === 1 ? paper : '#D7E9F7', index === 2 ? orange : teal)
      block.position.copy(position)
      block.rotation.set(0.12, index * 0.64 - 0.4, -0.08)
      shipmentBlocks.push(block)
      stage.add(block)
    })

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    let frameId = 0
    const render = () => {
      const elapsed = clock.getElapsedTime()
      stage.rotation.y = Math.sin(elapsed * 0.22) * 0.09
      hub.position.y = 0.58 + Math.sin(elapsed * 1.05) * 0.035
      orbitOne.rotation.z = elapsed * 0.14
      orbitTwo.rotation.z = -elapsed * 0.09

      routeDots.forEach(({ mesh, curve, offset }, index) => {
        const point = curve.getPoint((elapsed * 0.11 + offset) % 1)
        mesh.position.copy(point)
        mesh.scale.setScalar(1 + Math.sin(elapsed * 2.3 + index) * 0.18)
      })

      shipmentBlocks.forEach((block, index) => {
        block.position.y += Math.sin(elapsed * 1.2 + index * 1.7) * 0.0018
        block.rotation.y += 0.004 + index * 0.0012
      })

      nodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(elapsed * 1.9 + index) * 0.055
        node.scale.setScalar(pulse)
      })

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(render)
    }

    render()

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
    }
  }, [compact])

  return (
    <Box
      ref={mountRef}
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: compact ? 0 : { md: '-22px -78px -8px -78px', lg: '-30px -104px -10px -104px' },
        zIndex: 2,
        pointerEvents: 'none',
        '& canvas': {
          display: 'block',
          width: '100%',
          height: '100%',
          filter: 'drop-shadow(0 18px 30px rgba(6, 26, 51, 0.18))',
        },
      }}
    />
  )
}
